// End-to-end tests: a real browser against the real server (fresh SQLite file, demo mail inbox).
// Prerequisite: the site built for same-origin API use:  cross-env VITE_API_URL=same-origin npm run build
// Run: npm run test:e2e   (set CHROME_PATH if Chrome is not in the default location)
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import { rmSync, readFileSync } from 'node:fs'
import { TOTP, Secret } from 'otpauth'

const bundled = JSON.parse(readFileSync('src/content/content.json', 'utf8'))
const PORT = 4180
const BASE = `http://localhost:${PORT}`
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const DIR = './.e2e'
const rnd = Math.random().toString(36).slice(2, 8)
const OWNER = `owner-${rnd}@example.test`
const VISITOR = `visitor-${rnd}@example.test`
const STRANGER = `stranger-${rnd}@example.test`
let failed = 0
const ok = (name, cond, extra = '') => { if (!cond) failed++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`) }

// ---- start a clean server
rmSync(DIR, { recursive: true, force: true })
const server = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'server/src/node.ts'], { env: { ...process.env, PORT: String(PORT), DEMO_DIR: DIR, OWNER_EMAIL: OWNER, DEV_INBOX: '1' }, stdio: ['ignore', 'pipe', 'pipe'] })
let serverLog = ''
server.stdout.on('data', (d) => (serverLog += d))
server.stderr.on('data', (d) => (serverLog += d))
for (let i = 0; i < 80 && !/running at/.test(serverLog); i++) await new Promise((r) => setTimeout(r, 150))
if (!/running at/.test(serverLog)) { console.log('server failed to start:\n' + serverLog); server.kill(); process.exit(1) }
const q = (sql, ...p) => { const db = new DatabaseSync(`${DIR}/portfolio.sqlite`, { readOnly: true }); try { return db.prepare(sql).get(...p) } finally { db.close() } }

async function code(email, since) {
  for (let i = 0; i < 60; i++) {
    const r = await fetch(`${BASE}/api/dev/last-mail?to=${encodeURIComponent(email)}`)
    if (r.ok) {
      const m = await r.json()
      const c = /\b(\d{6})\b/.exec(m.text || '')
      if (c && m.at >= since) return c[1]
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('no code for ' + email)
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const errors = []
const violations = []
async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 }, ...opts })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 200)))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon|api\.github\.com/.test(m.text())) errors.push('console.error: ' + m.text().slice(0, 200)) })
  await page.exposeFunction('__csp', (v) => violations.push(v))
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => window.__csp(`${e.violatedDirective} ${e.blockedURI}`)))
  return { ctx, page }
}
const otp = async (page, value) => { await page.locator('input[autocomplete="one-time-code"]').first().fill(value) }
const progress = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('pf.progress') || '{}'))
async function requestCode(page, email, name) {
  const dlg = page.getByRole('dialog')
  if (name) await dlg.getByLabel('Display name (optional)').fill(name)
  await dlg.getByLabel('Email').fill(email)
  const since = Date.now()
  await page.getByRole('button', { name: 'Send me a code' }).click()
  await page.getByText('Check your email').waitFor()
  return since
}

try {
  // ------------------------------------------------------------ design rules + CSP
  {
    const { ctx, page } = await open()
    const res = await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    ok('the server sends a Content-Security-Policy', /default-src 'self'/.test(res.headers()['content-security-policy'] ?? ''))
    const text = await page.evaluate(() => document.body.innerText)
    // (c), (r), tm are typographic marks that Unicode also lists as pictographs; they are not emoji.
    const emoji = text.replace(/[©®™]/g, '').match(/\p{Extended_Pictographic}/gu)
    ok('no emoji anywhere in the rendered page', !emoji, emoji ? `(${[...new Set(emoji)].join(' ')})` : '')
    const gradients = await page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => /gradient/.test(getComputedStyle(e).backgroundImage) && !e.closest('svg')).length)
    ok('gradients are rare (at most a few)', gradients <= 4, `(${gradients} elements)`)
    ok('the 3D board renders under the CSP', (await page.locator('canvas').count()) >= 1)
    await ctx.close()
  }


  // ------------------------------------------------------------ layout audit: alignment at every screen size, in two very different themes
  {
    const WIDTHS = [360, 390, 430, 600, 768, 820, 1024, 1180, 1280, 1366, 1440, 1680, 1920, 2560]
    const THEMES = [['nyonya', 'light'], ['cyber', 'dark']]
    const problems = []
    for (const [theme, mode] of THEMES) {
      for (const w of WIDTHS) {
        const mobile = w < 820
        const { ctx, page } = await open({ viewport: { width: w, height: 900 }, hasTouch: mobile, isMobile: mobile, colorScheme: mode })
        await page.addInitScript(([t, m]) => { localStorage.setItem('pf.progress', JSON.stringify({ theme: t, mode: m })); sessionStorage.setItem('pf.boot', '1') }, [theme, mode])
        await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(900)
        const r = await page.evaluate(() => {
          const out = []
          const rect = (el) => el.getBoundingClientRect()
          if (document.documentElement.scrollWidth > innerWidth) out.push(`horizontal overflow ${document.documentElement.scrollWidth - innerWidth}px`)
          // nav (or dock on small screens) must share the content column's edges
          const bar = [...document.querySelectorAll('nav')].find((n) => n.getBoundingClientRect().width > 0 && getComputedStyle(n).display !== 'none' && n.className.includes('glass'))
          const col = document.querySelector('#showcase')
          if (bar && col) { const a = rect(bar), b = rect(col); if (Math.abs(a.left - b.left) > 1.5 || Math.abs(a.right - b.right) > 1.5) out.push(`nav edges ${Math.round(a.left)}-${Math.round(a.right)} vs content ${Math.round(b.left)}-${Math.round(b.right)}`) }
          // desktop hero: both columns end together
          const wrap = document.querySelector('#top .wrap')
          if (wrap && innerWidth >= 1024) {
            // the last CARD of each column, not the column wrapper (wrappers are equal by construction and hide voids)
            const ends = [...wrap.children].map((c) => rect(c.lastElementChild).bottom)
            if (ends.length === 2 && Math.abs(ends[0] - ends[1]) > 2) out.push(`hero cards end ${Math.round(ends[0])} vs ${Math.round(ends[1])}`)
          }
          // nothing readable may be cut off or spill out of its container
          const skip = (el) => !!el.closest('.marquee-wrap, [aria-label^="Decorative"], [aria-label="Albums"], [role="tablist"], nav, .sr-only, [aria-hidden="true"]')
          const scrolls = (el) => { for (let a = el.parentElement; a; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll') return true } return false }
          for (const el of document.querySelectorAll('main h1, main h2, main h3, main h4, main p, main button, main a, main dt, main dd, main li')) {
            if (skip(el) || scrolls(el)) continue
            const b = rect(el)
            if (b.width === 0 || b.height === 0) continue
            if (b.left < -1 || b.right > innerWidth + 1) { out.push(`off-screen: "${(el.textContent || '').trim().slice(0, 30)}" ${Math.round(b.left)}..${Math.round(b.right)}`); continue }
            const host = el.parentElement?.closest('.card, .card-raised')
            if (host) { const h = rect(host); if (b.right > h.right + 1 || b.left < h.left - 1) out.push(`spills out of its card: "${(el.textContent || '').trim().slice(0, 30)}"`) }
          }
          return [...new Set(out)].slice(0, 4)
        })
        for (const m of r) problems.push(`${theme} ${w}px: ${m}`)
        await ctx.close()
      }
    }
    ok(`layout holds at ${WIDTHS.length} widths in 2 themes (no overflow, aligned edges, hero cards end together, nothing clipped)`, problems.length === 0, problems.length ? '\n    ' + problems.slice(0, 14).join('\n    ') : '')
  }


  // ------------------------------------------------------------ age badge, stale cache, cyberpunk theme, journey bug
  {
    // Age replaces the level. Only year and month are used.
    const year = new Date().getFullYear() - 25
    const draft = { ...bundled, profile: { ...bundled.profile, birthYear: year, birthMonth: 1 } }
    let { ctx, page } = await open()
    await page.addInitScript((d) => localStorage.setItem('pf.draft', JSON.stringify(d)), draft)
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
    ok('the profile badge shows my age, not a level', (await page.getByLabel('Age 25').count()) === 1)
    ok('and the old level badge is gone', (await page.getByTitle('Profile level').count()) === 0)
    await ctx.close()
    ;({ ctx, page } = await open())
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
    ok('with no birth date set, no badge (never a made-up number)', (await page.getByLabel(/^Age \d+/).count()) === 0)
    await ctx.close()

    // Regression: content cached by an older version must never override the current site.
    const stale = { profile: { name: 'Old Name', bio: 'old 🐛' }, sections: [{ id: 'projects', label: 'Library', title: 'Old', subtitle: '', visible: true }], achievements: [{ id: 'x', title: 'Old', description: '', icon: '🏆', rarity: 'rare', date: '', issuer: '', featured: false }] }
    ;({ ctx, page } = await open())
    await page.addInitScript((d) => { localStorage.setItem('pf.draft', JSON.stringify(d)); localStorage.setItem('pf.remote', JSON.stringify(d)) }, stale)
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
    ok('stale cached content is discarded instead of overriding the new site', (await page.locator('h1').innerText()) === 'Lim Jun Hong' && (await page.locator('nav[aria-label="Main"]').innerText()).includes('Games') && !(await page.locator('nav[aria-label="Main"]').innerText()).includes('Library'))
    ok('and the stale cache is cleared', (await page.evaluate(() => [localStorage.getItem('pf.draft'), localStorage.getItem('pf.remote')].join())) === ',')
    await ctx.close()

    // Cyberpunk theme: neon layer, starfield, boot sequence (once per session, skippable, never with reduced motion)
    ;({ ctx, page } = await open({ colorScheme: 'dark' }))
    await page.addInitScript(() => localStorage.setItem('pf.progress', JSON.stringify({ theme: 'cyber', mode: 'dark' })))
    await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('status', { name: /Loading the profile/ }).waitFor({ timeout: 5000 })
    ok('the Cyberpunk theme opens with a boot sequence', true)
    await page.keyboard.press('Space')
    await page.getByRole('status', { name: /Loading the profile/ }).waitFor({ state: 'detached', timeout: 3000 })
    ok('any key skips the boot sequence', true)
    ok('the neon effects layer is on (scanlines, glow, gradient titles)', (await page.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.fx, getComputedStyle(document.querySelector('h1')).backgroundClip].join())) === 'cyber,neon,text')
    ok('the starfield canvas is running', (await page.locator('canvas.fixed').count()) === 1)
    ok('the theme swaps the body font to monospace', /JetBrains/.test(await page.evaluate(() => getComputedStyle(document.body).fontFamily)))
    await page.reload({ waitUntil: 'networkidle' })
    ok('the boot sequence plays once per session, not on every reload', (await page.getByRole('status', { name: /Loading the profile/ }).count()) === 0)
    await ctx.close()
    ;({ ctx, page } = await open({ colorScheme: 'dark', reducedMotion: 'reduce' }))
    await page.addInitScript(() => localStorage.setItem('pf.progress', JSON.stringify({ theme: 'cyber', mode: 'dark' })))
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
    ok('reduced motion: no boot sequence and no animated starfield', (await page.getByRole('status', { name: /Loading the profile/ }).count()) === 0 && (await page.locator('canvas.fixed').count()) === 1 && (await page.evaluate(() => getComputedStyle(document.querySelector('.marquee')).animationPlayState)) === 'paused')
    await ctx.close()

    // The bug crawls down the timeline as you scroll.
    ;({ ctx, page } = await open())
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
    const bugY = () => page.evaluate(() => { const r = document.querySelector('#journey ol svg.lucide-bug').getBoundingClientRect(); return Math.round(r.top + scrollY) })
    await page.evaluate(() => document.getElementById('journey').scrollIntoView({ behavior: 'instant' }))
    await page.waitForTimeout(1200)
    const a = await bugY()
    await page.evaluate(() => scrollBy(0, 900))
    await page.waitForTimeout(1500)
    const b2 = await bugY()
    ok('the bug crawls down the journey timeline as you scroll', b2 > a + 150, `(${a}px -> ${b2}px)`)
    ok('and lights the stops it has passed', (await page.evaluate(() => [...document.querySelectorAll('#journey ol li > span')].filter((e) => e.style.transform === 'scale(1)').length)) >= 2)
    await ctx.close()
  }

  // ------------------------------------------------------------ theme + mode
  {
    const { ctx, page } = await open({ colorScheme: 'light' })
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
    ok('follows the OS light setting by default', (await page.evaluate(() => document.documentElement.dataset.mode)) === 'light')
    await page.getByRole('button', { name: 'Choose profile theme' }).click()
    await page.getByRole('radio', { name: /Sakura/ }).click()
    await page.getByRole('radio', { name: /Dark/ }).click()
    ok('visitor can switch palette and mode', (await page.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.mode].join())) === 'sakura,dark')
    await page.waitForTimeout(600) // body colour transitions over 300ms
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    ok('theme actually changes the page colours', bg === 'rgb(29, 15, 21)', bg)
    await page.keyboard.press('Escape')
    await page.reload({ waitUntil: 'networkidle' })
    ok('theme choice survives a reload', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'sakura')
    await page.keyboard.press('Control+k')
    await page.getByPlaceholder('Jump to a section or run a command').fill('arcade')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(3000)
    ok('command menu (Ctrl+K) navigates to a section', (await page.evaluate(() => document.getElementById('arcade').getBoundingClientRect().top)) < 200)
    await ctx.close()
  }

  // ------------------------------------------------------------ visitor sign-in + progress sync
  {
    const { ctx, page } = await open()
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Sign in' }).first().click()
    const since = await requestCode(page, VISITOR, 'Rae Tester')
    await otp(page, '000000')
    await page.getByRole('alert').waitFor()
    ok('a wrong code is refused with a clear message', /wrong or has expired/i.test(await page.getByRole('alert').innerText()))
    await otp(page, await code(VISITOR, since))
    await page.getByRole('heading', { name: "You're signed in" }).waitFor()
    ok('one-time code signs the visitor in', true)
    await page.getByRole('button', { name: 'Back to the profile' }).click()
    ok('nav shows the visitor name', (await page.locator('nav[aria-label="Main"]').innerText()).includes('Rae Tester'))
    ok('the session token is not in the page URL or cookies', !(await page.url()).includes('s_') && (await ctx.cookies()).length === 0)
    // Five taps in quick succession, like a finger (Playwright's own click cadence can exceed the 1.2 s window).
    await page.getByRole('link', { name: 'Home. Tap five times for a surprise.' }).evaluate((el) => { for (let i = 0; i < 5; i++) el.click() })
    await page.waitForTimeout(3500)
    const saved = q('SELECT progress FROM users WHERE email = ?', VISITOR)
    ok('5 logo taps open the console and the achievement syncs to the account', !!saved && JSON.parse(saved.progress).eggs?.terminal > 0, `(db: ${saved?.progress})`)
    await ctx.close()

    const b = await open()
    await b.page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
    await b.page.getByRole('button', { name: 'Sign in' }).first().click()
    const since2 = await requestCode(b.page, VISITOR)
    await otp(b.page, await code(VISITOR, since2))
    await b.page.getByRole('heading', { name: "You're signed in" }).waitFor()
    await b.page.waitForTimeout(1200)
    ok('signing in on a second device restores earned achievements', !!(await progress(b.page)).eggs?.terminal)
    await b.ctx.close()
  }

  // ------------------------------------------------------------ contact form
  {
    const { ctx, page } = await open()
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.getElementById('contact').scrollIntoView())
    const form = page.getByRole('form', { name: 'Send me a message' })
    await form.getByLabel('Your name').fill('Sam Recruiter')
    await form.getByLabel('Email', { exact: true }).fill(`sam-${rnd}@example.test`)
    await form.getByLabel('WhatsApp number').fill('123')
    await form.getByLabel('Message').fill('Hi! We would like to talk about a role.')
    await form.getByRole('button', { name: 'Send message' }).click()
    ok('an invalid WhatsApp number is rejected before sending', (await page.getByText(/does not look valid/).count()) === 1)
    await form.getByLabel('WhatsApp number').fill('12 345 6789')
    await form.getByRole('button', { name: 'Send message' }).click()
    await page.getByText('Message sent').waitFor()
    const row = q('SELECT whatsapp FROM messages WHERE email = ?', `sam-${rnd}@example.test`)
    ok('message stored with the WhatsApp number normalised to E.164', row?.whatsapp === '+60123456789', `(db: ${row?.whatsapp})`)
    await ctx.close()
  }

  // ------------------------------------------------------------ guard: a stranger cannot get in
  {
    const { ctx, page } = await open()
    await page.goto(`${BASE}/#/admin`, { waitUntil: 'networkidle' })
    ok('anonymous visitors see a sign-in wall, not the CMS', (await page.getByRole('heading', { name: 'Backstage' }).count()) === 1 && (await page.getByText('Publish').count()) === 0)
    await page.getByRole('button', { name: 'Sign in', exact: true }).last().click()
    const since = await requestCode(page, STRANGER)
    await otp(page, await code(STRANGER, since))
    await page.getByRole('heading', { name: "You're signed in" }).waitFor()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(800)
    ok('a signed-in non-owner is told access is owner-only', (await page.getByRole('heading', { name: 'Owner access only' }).count()) === 1)
    ok('and no CMS tabs are rendered for them', (await page.getByRole('navigation', { name: 'CMS sections' }).count()) === 0)
    const statuses = await page.evaluate(async () => {
      const t = localStorage.getItem('pf.token')
      const call = (m, p) => fetch(p, { method: m, headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' }, body: m === 'GET' ? undefined : '{}' }).then((r) => r.status)
      return [await call('GET', '/api/owner/messages'), await call('PUT', '/api/owner/content'), await call('POST', '/api/owner/totp/setup'), await call('GET', '/api/owner/friends')]
    })
    ok('calling the owner API directly with their token is refused', statuses.every((s) => s === 403), `(${statuses})`)
    await ctx.close()
  }

  // ------------------------------------------------------------ owner: sign-in -> TOTP enrol -> inbox -> publish
  {
    const { ctx, page } = await open()
    await page.goto(`${BASE}/#/admin`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Sign in', exact: true }).last().click()
    const since = await requestCode(page, OWNER)
    await otp(page, await code(OWNER, since))
    await page.getByRole('heading', { name: "You're signed in" }).waitFor()
    await page.keyboard.press('Escape')
    await page.getByRole('heading', { name: 'Set up two-step verification' }).waitFor()
    ok('the owner email alone is not enough: two-step setup is required', (await page.getByRole('navigation', { name: 'CMS sections' }).count()) === 0)
    const secret = (await page.locator('code').first().innerText()).trim()
    await otp(page, '000000')
    await page.getByText('That code is not right').waitFor()
    ok('a wrong authenticator code is refused', true)
    await otp(page, new TOTP({ secret: Secret.fromBase32(secret), digits: 6, period: 30 }).generate({ timestamp: Date.now() + 30_000 }))
    await page.getByRole('navigation', { name: 'CMS sections' }).waitFor()
    ok('a correct authenticator code unlocks the CMS', true)
    const enc = q('SELECT secret_enc FROM owner_totp')
    ok('the authenticator secret is stored encrypted', !!enc && !enc.secret_enc.includes(secret))
    await page.getByRole('button', { name: /Sam Recruiter/ }).click()
    ok('the owner sees the visitor message in the inbox', (await page.getByText('talk about a role').count()) >= 1)
    ok('the inbox offers a WhatsApp reply link', (await page.getByRole('link', { name: /WhatsApp \+60123456789/ }).getAttribute('href')) === 'https://wa.me/60123456789')
    await page.getByRole('button', { name: 'Friends', exact: true }).click()
    await page.getByText('Rae Tester').waitFor({ timeout: 8000 }).catch(() => {})
    ok('the owner sees who has signed in', (await page.getByText('Rae Tester').count()) === 1)
    await page.getByRole('button', { name: 'Profile', exact: true }).click()
    await page.locator('input.field').nth(2).fill(`Published by e2e ${rnd}`)
    await page.getByRole('button', { name: 'Publish', exact: true }).click()
    await page.getByRole('button', { name: 'Publish changes' }).click()
    await page.getByText('Published. Visitors see').waitFor()
    ok('the owner can publish content', true)
    await ctx.close()

    const anon = await open()
    await anon.page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
    await anon.page.waitForTimeout(1500)
    ok('an anonymous visitor immediately sees the published change (no redeploy)', (await anon.page.getByLabel(`Published by e2e ${rnd}`).count()) >= 1)
    await anon.ctx.close()
  }

  // ------------------------------------------------------------ phone: paging + touch easter eggs + sound
  {
    const { ctx, page } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    const wavs = []
    page.on('response', (r) => { if (/\/sfx\/.*\.wav/.test(r.url())) wavs.push(r.status()) })
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    ok('sections snap like pages on phones', await page.evaluate(() => document.documentElement.classList.contains('snap') && getComputedStyle(document.documentElement).scrollSnapType.includes('mandatory')))
    ok('a bottom dock lists the tabs', (await page.getByRole('navigation', { name: 'Sections' }).getByRole('button').count()) >= 8)
    await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Games' }).click()
    await page.waitForTimeout(1200)
    const top = await page.evaluate(() => Math.round(document.getElementById('projects').getBoundingClientRect().top))
    // Pages align 80px from the top on purpose (scroll-padding), leaving room for the floating nav.
    ok('tapping a tab lands exactly on that page', Math.abs(top - 80) <= 2, `(top=${top}px)`)
    ok('sound effects load from the CC0 pack', wavs.length > 0 && wavs.every((s) => s === 200), `(${wavs.length} files)`)

    const card = page.getByRole('button', { name: 'Open BanjirKawan' })
    await card.scrollIntoViewIfNeeded()
    const box = await card.boundingBox()
    await page.mouse.move(box.x + 40, box.y + 40)
    await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up()
    await page.waitForTimeout(500)
    ok('press and hold BanjirKawan summons the flood on touch', !!(await progress(page)).eggs?.flood)

    await page.evaluate(() => document.querySelector('footer').scrollIntoView())
    await page.waitForTimeout(700)
    for (const w of ['Build.', 'Verify.', 'Ship.', 'Repeat.']) await page.getByRole('button', { name: w }).tap()
    await page.waitForTimeout(400)
    ok('tapping the motto words unlocks "Ship it" on touch', !!(await progress(page)).eggs?.shipit)

    await page.evaluate(() => {
      const send = (type, x, y) => {
        const t = new Touch({ identifier: 1, target: document.body, clientX: x, clientY: y })
        window.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true }))
      }
      const swipe = (dx, dy) => { send('touchstart', 200, 400); send('touchend', 200 + dx, 400 + dy) }
      const tap = () => { send('touchstart', 200, 400); send('touchend', 201, 401) }
      for (const [dx, dy] of [[0, -120], [0, -120], [0, 120], [0, 120], [-120, 0], [120, 0], [-120, 0], [120, 0]]) swipe(dx, dy)
      tap(); tap()
    })
    await page.waitForTimeout(500)
    ok('swipe up, up, down, down, left, right, left, right, tap, tap unlocks the Konami egg on touch', !!(await progress(page)).eggs?.konami)
    await page.waitForTimeout(6200)

    const bug = await page.locator('button[aria-label^="A suspicious bug"]').first().boundingBox()
    ok('hidden bugs have a finger-sized tap target (>= 44px)', bug.width >= 44 && bug.height >= 44, `(${Math.round(bug.width)}x${Math.round(bug.height)})`)
    await page.evaluate(() => document.getElementById('achievements').scrollIntoView())
    await page.waitForTimeout(600)
    ok('hidden achievements show touch instructions on phones', (await page.getByText(/Tap the profile picture seven times/).count()) >= 1)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    ok('no horizontal overflow at 390px', overflow <= 0, `(${overflow}px)`)
    await ctx.close()
  }

  // ------------------------------------------------------------ desktop keyboard eggs still work
  {
    const { ctx, page } = await open()
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
    await page.keyboard.press('`')
    await page.getByLabel('Console input').fill('sudo hire-me')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    ok('sudo hire-me works in the console', !!(await progress(page)).eggs?.hire)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await page.keyboard.press(k)
    await page.waitForTimeout(400)
    ok('the keyboard Konami code still works', !!(await progress(page)).eggs?.konami)
    await ctx.close()
  }

  ok('the Content-Security-Policy blocked nothing the site needs', violations.length === 0, violations.length ? `(${[...new Set(violations)].join('; ')})` : '')
  console.log('\nBrowser errors:', errors.length ? '\n  ' + [...new Set(errors)].join('\n  ') : 'none')
} catch (e) {
  failed++
  console.log('CRASH', e)
} finally {
  await browser.close()
  server.kill()
  await new Promise((r) => (server.exitCode !== null ? r() : server.once('exit', r)))
  try { rmSync(DIR, { recursive: true, force: true }) } catch { /* Windows may hold the file briefly; the next run clears it */ }
}
console.log(failed ? `\n${failed} FAILED` : '\nAll end-to-end checks passed')
process.exit(failed ? 1 : 0)

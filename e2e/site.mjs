// End-to-end tests: real browser + the local backend (`npm run backend:up`, then build with the local env and preview on :4173).
// Run: npm run test:e2e   (set CHROME_PATH if Chrome is not in the default location)
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import { TOTP, Secret } from 'otpauth'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const rnd = Math.random().toString(36).slice(2, 8)
const OWNER = `owner-${rnd}@example.test`
const VISITOR = `visitor-${rnd}@example.test`
const STRANGER = `stranger-${rnd}@example.test`
let failed = 0
const ok = (name, cond, extra = '') => { if (!cond) failed++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`) }
const psql = (sql) => execFileSync('docker', ['compose', '-f', 'supabase/local/docker-compose.yml', 'exec', '-T', 'db', 'psql', '-U', 'postgres', '-tAc', sql], { encoding: 'utf8' }).trim()

async function code(email) {
  for (let i = 0; i < 60; i++) {
    const list = await (await fetch(`http://localhost:54324/api/v1/search?query=${encodeURIComponent('to:' + email)}`)).json()
    if (list.messages?.length) {
      const msg = await (await fetch(`http://localhost:54324/api/v1/message/${list.messages[0].ID}`)).json()
      const m = /\b(\d{6})\b/.exec(msg.Text || '')
      if (m) return m[1]
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('no code for ' + email)
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const errors = []
async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 }, ...opts })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 200)))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon|realtime\/v1\/websocket/.test(m.text())) errors.push('console.error: ' + m.text().slice(0, 200)) })
  return { ctx, page }
}
const otp = async (page, value) => { await page.locator('input[autocomplete="one-time-code"]').first().fill(value) }
const progress = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('pf.progress') || '{}'))

psql(`insert into public.owner_emails(email) values ('${OWNER}')`)
psql('truncate public.messages')
psql("notify pgrst, 'reload schema'")
await new Promise((r) => setTimeout(r, 1200))

// ---------------------------------------------------------------- design rules
{
  const { ctx, page } = await open()
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const text = await page.evaluate(() => document.body.innerText)
  // (c), (r), tm are typographic marks that Unicode also lists as pictographs; they are not emoji.
  const emoji = text.replace(/[©®™]/g, '').match(/\p{Extended_Pictographic}/gu)
  ok('no emoji anywhere in the rendered page', !emoji, emoji ? `(${[...new Set(emoji)].join(' ')})` : '')
  const gradients = await page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => /gradient/.test(getComputedStyle(e).backgroundImage) && !e.closest('svg') && !e.closest('[class*="flip"]')).length)
  ok('gradients are rare (at most a few)', gradients <= 4, `(${gradients} elements)`)
  await ctx.close()
}

// ---------------------------------------------------------------- theme + mode
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

// ---------------------------------------------------------------- visitor sign-in + progress sync
let visitorId
{
  const { ctx, page } = await open()
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Sign in' }).first().click()
  const dlg = page.getByRole('dialog')
  await dlg.getByLabel('Display name (optional)').fill('Rae Tester')
  await dlg.getByLabel('Email').fill(VISITOR)
  await page.getByRole('button', { name: 'Send me a code' }).click()
  await page.getByText('Check your email').waitFor()
  await otp(page, '000000')
  await page.getByRole('alert').waitFor()
  ok('a wrong code is refused with a clear message', /wrong or has expired/i.test(await page.getByRole('alert').innerText()))
  await otp(page, await code(VISITOR))
  await page.getByRole('heading', { name: "You're signed in" }).waitFor()
  ok('one-time code signs the visitor in', true)
  await page.getByRole('button', { name: 'Back to the profile' }).click()
  ok('nav shows the visitor name', (await page.locator('nav[aria-label="Main"]').innerText()).includes('Rae Tester'))
  // earn something, confirm it is saved to their cloud profile
  for (let i = 0; i < 5; i++) await page.getByRole('link', { name: 'Home. Tap five times for a surprise.' }).click()
  await page.waitForTimeout(3500)
  visitorId = psql(`select id from auth.users where email='${VISITOR}'`)
  const saved = psql(`select progress->'eggs' ? 'terminal' from public.profiles where id='${visitorId}'`)
  ok('5 logo taps open the console and the achievement syncs to the account', saved === 't', `(db: ${saved})`)
  await ctx.close()

  // new device, same account: progress comes back
  const b = await open()
  await b.page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
  await b.page.getByRole('button', { name: 'Sign in' }).first().click()
  await b.page.getByRole('dialog').getByLabel('Email').fill(VISITOR)
  await b.page.getByRole('button', { name: 'Send me a code' }).click()
  await b.page.getByText('Check your email').waitFor()
  await new Promise((r) => setTimeout(r, 1200))
  await otp(b.page, await code(VISITOR))
  await b.page.getByRole('heading', { name: "You're signed in" }).waitFor()
  await b.page.waitForTimeout(1200)
  ok('signing in on a second device restores earned achievements', !!(await progress(b.page)).eggs?.terminal)
  await b.ctx.close()
}

// ---------------------------------------------------------------- contact form
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
  const row = psql(`select whatsapp from public.messages where email='sam-${rnd}@example.test'`)
  ok('message stored with the WhatsApp number normalised to E.164', row === '+60123456789', `(db: ${row})`)
  await ctx.close()
}

// ---------------------------------------------------------------- guard: a stranger cannot get in
{
  const { ctx, page } = await open()
  await page.goto(`${BASE}/#/admin`, { waitUntil: 'networkidle' })
  ok('anonymous visitors see a sign-in wall, not the CMS', (await page.getByRole('heading', { name: 'Backstage' }).count()) === 1 && (await page.getByText('Publish').count()) === 0)
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click()
  await page.getByRole('dialog').getByLabel('Email').fill(STRANGER)
  await page.getByRole('button', { name: 'Send me a code' }).click()
  await page.getByText('Check your email').waitFor()
  await otp(page, await code(STRANGER))
  await page.getByRole('button', { name: 'Back to the profile' }).click().catch(() => {})
  await page.waitForTimeout(800)
  ok('a signed-in non-owner is told access is owner-only', (await page.getByRole('heading', { name: 'Owner access only' }).count()) === 1)
  ok('and no CMS tabs are rendered for them', (await page.getByRole('navigation', { name: 'CMS sections' }).count()) === 0)
  await ctx.close()
}

// ---------------------------------------------------------------- owner: sign-in -> TOTP enrol -> inbox -> publish
{
  const { ctx, page } = await open()
  await page.goto(`${BASE}/#/admin`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click()
  await page.getByRole('dialog').getByLabel('Email').fill(OWNER)
  await page.getByRole('button', { name: 'Send me a code' }).click()
  await page.getByText('Check your email').waitFor()
  await otp(page, await code(OWNER))
  await page.keyboard.press('Escape')
  await page.getByRole('heading', { name: 'Set up two-step verification' }).waitFor()
  ok('the owner email alone is not enough: two-step setup is required', (await page.getByRole('navigation', { name: 'CMS sections' }).count()) === 0)
  const secret = (await page.locator('code').first().innerText()).trim()
  await otp(page, '000000')
  await page.getByText('That code is not right').waitFor()
  ok('a wrong authenticator code is refused', true)
  await new Promise((r) => setTimeout(r, 1000))
  await otp(page, new TOTP({ secret: Secret.fromBase32(secret), digits: 6, period: 30 }).generate())
  await page.getByRole('navigation', { name: 'CMS sections' }).waitFor()
  ok('a correct authenticator code unlocks the CMS', true)
  await page.getByRole('button', { name: /Sam Recruiter/ }).click()
  ok('the owner sees the visitor message in the inbox', (await page.getByText('talk about a role').count()) >= 1)
  ok('the inbox offers a WhatsApp reply link', (await page.getByRole('link', { name: /WhatsApp \+60123456789/ }).getAttribute('href')) === 'https://wa.me/60123456789')
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

// ---------------------------------------------------------------- phone: paging + touch easter eggs + sound
{
  const { ctx, page } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const wavs = []
  page.on('response', (r) => { if (/\/sfx\/.*\.wav/.test(r.url())) wavs.push(r.status()) })
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  ok('sections snap like pages on phones', (await page.evaluate(() => document.documentElement.classList.contains('snap') && getComputedStyle(document.documentElement).scrollSnapType.includes('mandatory'))))
  ok('a bottom dock lists the tabs', (await page.getByRole('navigation', { name: 'Sections' }).getByRole('button').count()) >= 8)
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Games' }).click()
  await page.waitForTimeout(1200)
  const top = await page.evaluate(() => Math.round(document.getElementById('projects').getBoundingClientRect().top))
  // Pages align 80px from the top on purpose (scroll-padding), leaving room for the floating nav.
  ok('tapping a tab lands exactly on that page', Math.abs(top - 80) <= 2, `(top=${top}px)`)
  ok('sound effects load from the CC0 pack', wavs.length > 0 && wavs.every((s) => s === 200), `(${wavs.length} files)`)

  // long-press the BanjirKawan card -> flood
  const card = page.getByRole('button', { name: 'Open BanjirKawan' })
  await card.scrollIntoViewIfNeeded()
  const box = await card.boundingBox()
  await page.mouse.move(box.x + 40, box.y + 40)
  await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up()
  await page.waitForTimeout(500)
  ok('press and hold BanjirKawan summons the flood on touch', !!(await progress(page)).eggs?.flood)

  // tap motto words in order
  await page.evaluate(() => document.querySelector('footer').scrollIntoView())
  await page.waitForTimeout(700)
  for (const w of ['Build.', 'Verify.', 'Ship.', 'Repeat.']) await page.getByRole('button', { name: w }).tap()
  await page.waitForTimeout(400)
  ok('tapping the motto words unlocks "Ship it" on touch', !!(await progress(page)).eggs?.shipit)

  // swipe konami via synthetic touch events
  await page.evaluate(async () => {
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

  // hidden bug is a real tap target
  const bug = await page.locator('button[aria-label^="A suspicious bug"]').first().boundingBox()
  ok('hidden bugs have a finger-sized tap target (>= 44px)', bug.width >= 44 && bug.height >= 44, `(${Math.round(bug.width)}x${Math.round(bug.height)})`)
  // touch hints
  await page.evaluate(() => document.getElementById('achievements').scrollIntoView())
  await page.waitForTimeout(600)
  ok('hidden achievements show touch instructions on phones', (await page.getByText(/Tap the profile picture seven times/).count()) >= 1)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  ok('no horizontal overflow at 390px', overflow <= 0, `(${overflow}px)`)
  await ctx.close()
}

// ---------------------------------------------------------------- desktop keyboard eggs still work
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

psql(`delete from public.owner_emails where email='${OWNER}'`)
psql('delete from public.site_content') // the publish test wrote content; leave the local database as it was found
console.log('\nBrowser errors:', errors.length ? '\n  ' + [...new Set(errors)].join('\n  ') : 'none')
console.log(failed ? `\n${failed} FAILED` : '\nAll end-to-end checks passed')
await browser.close()
process.exit(failed ? 1 : 0)

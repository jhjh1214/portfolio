// End-to-end tests: a real browser against the real server (fresh SQLite file, demo mail inbox).
// Prerequisite: the site built for same-origin API use:  cross-env VITE_API_URL=same-origin npm run build
// Run: npm run test:e2e   (set CHROME_PATH if Chrome is not in the default location)
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import { rmSync } from 'node:fs'
import { TOTP, Secret } from 'otpauth'

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

// Local server: the same API code as the Cloudflare Worker, backed by a SQLite file, also serving the built site.
// `npm run demo` builds the site and starts this. Sign-in codes are printed here and readable via /api/dev/last-mail.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { createApp, type Bindings } from './app'
import { sqliteDb } from './sqlite'
import csp from '../csp.json' with { type: 'json' }

const port = Number(process.env.PORT ?? 8787)
const dir = process.env.DEMO_DIR ?? './.demo'
mkdirSync(dir, { recursive: true })

// A stable secret per demo folder, so codes and enrolled authenticators survive restarts.
const secretFile = `${dir}/secret`
if (!existsSync(secretFile)) writeFileSync(secretFile, randomBytes(32).toString('hex'), { mode: 0o600 })

const env: Bindings = {
  DB: sqliteDb(`${dir}/portfolio.sqlite`),
  APP_SECRET: process.env.APP_SECRET ?? readFileSync(secretFile, 'utf8'),
  OWNER_EMAIL: process.env.OWNER_EMAIL ?? 'owner@demo.test',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  MAIL_FROM: process.env.MAIL_FROM,
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME,
  // Demo mode prints codes instead of emailing them, unless a real provider is configured.
  DEV_INBOX: process.env.DEV_INBOX ?? (process.env.BREVO_API_KEY ? '0' : '1'),
}

const api = createApp()
const site = new Hono()
site.all('/api/*', (c) => api.fetch(c.req.raw, env))
site.use('*', async (c, next) => {
  await next()
  c.res.headers.set('content-security-policy', csp.policy)
  c.res.headers.set('x-content-type-options', 'nosniff')
})
site.use('*', serveStatic({ root: './dist' }))
site.get('*', serveStatic({ path: './dist/index.html' }))

serve({ fetch: site.fetch, port }, () => {
  console.log(`\nPortfolio demo running at http://localhost:${port}`)
  console.log(`  Owner account (CMS at /#/admin): ${env.OWNER_EMAIL}`)
  console.log(`  Sign-in codes are printed below${env.DEV_INBOX === '1' ? ' (demo inbox on)' : ''}.\n`)
})

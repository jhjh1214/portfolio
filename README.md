# portfolio

Lim Jun Hong's portfolio, built as a Steam-style profile page: a tile-wall header, a game library of projects, achievements, an arcade, hidden things to find, a contact form, passwordless sign-in for visitors, and a CMS that only the owner can use.

The whole thing is one codebase you own: a React front end and a small TypeScript API (`server/`). No third-party backend.

## What's in it

- **Visitors** pick a palette (five, each with light and dark) like choosing a Steam profile background. They can sign in with just an email: a one-time 6-digit code every time, no password. Their XP, achievements, scores and theme then follow them across devices.
- **Contact** form with email and an optional WhatsApp number (validated to international format). You get it in the inbox and by email.
- **Owner CMS** at `/#/admin`: edit every section, upload photos, read the inbox (with email and WhatsApp reply links), see who has signed in, and publish instantly with no redeploy.
- **Phones** treat each section as a page: swipe or tap the bottom dock and it snaps to the next tab.
- **Hidden achievements** work on keyboard and touch. `secrets` in the console lists hints; each locked achievement also shows how to find it on a phone.
- Sound effects are Kenney's CC0 Interface Sounds, played with Howler. See `/#/colophon` for all credits.

## Architecture

```
browser  ──►  Cloudflare Worker  (server/src/worker.ts, Hono)
              ├─ static site      served by the platform from dist/
              ├─ /api/*           the API
              └─ D1 (SQLite)      users, sessions, messages, content, media
```

The same API code (`server/src/app.ts`) also runs on plain Node with a SQLite file (`server/src/node.ts`). That is the local demo and what the tests run against.

## Try it locally (no accounts, no Docker)

```bash
npm install
npm run demo
```

Open http://localhost:8787. Sign-in codes are printed in that terminal (and there is no email provider to set up). The owner account in demo mode is `owner@demo.test`: sign in at http://localhost:8787/#/admin, scan the QR code with an authenticator app, and the CMS opens. Your data lives in `.demo/`; delete the folder to start fresh.

Other commands:

```bash
npm run dev          # front end only (contact and sign-in say "not connected")
npm run server       # just the API on :8787; with `cross-env VITE_API_URL=same-origin vite` you get hot reload
npm run typecheck
npm test             # 64 tests: logic, TOTP against the RFC vectors, and 47 API security tests
npm run test:e2e     # real browser, real server, phones and all (needs Chrome; set CHROME_PATH if not default)
```

## Deploy it (free)

Cloudflare Workers hosts the site and the API together, with D1 as the database. No card is needed, and nothing sleeps.

1. `npx wrangler login`
2. `npx wrangler d1 create portfolio`, then paste the printed `database_id` into `wrangler.toml`.
3. `npm run db:init` creates the tables.
4. Set the secrets (each command prompts for the value):
   ```bash
   npx wrangler secret put APP_SECRET      # any long random string, e.g. output of: openssl rand -hex 32
   npx wrangler secret put OWNER_EMAIL     # your email: the only address that can ever become the owner
   npx wrangler secret put BREVO_API_KEY   # see "Email" below
   npx wrangler secret put MAIL_FROM       # the sender address you verified with Brevo
   ```
5. `npm run deploy` builds the site and publishes it to `https://portfolio.<your-subdomain>.workers.dev`.
6. Open `/#/admin`, sign in with your owner email, and scan the QR code once to set up two-step verification. Do this straight after deploying.

### Email

Sign-in codes and new-message alerts need an email sender. No host offers one for free, so the API calls [Brevo](https://www.brevo.com)'s HTTP API (free tier: 300 emails a day). You verify a single sender address; you do not need a domain. Create an API key under SMTP & API. To use another provider, change `sendMail` in `server/src/mailer.ts`.

### Automatic deploys (optional)

`.github/workflows/deploy-worker.yml` redeploys on every push to `main`. Add the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, and the repository variable `CLOUDFLARE_DEPLOY` = `true`.

### GitHub Pages copy (optional)

`.github/workflows/deploy.yml` also publishes a static copy to GitHub Pages. To make that copy talk to your Worker, add the repository variable `VITE_API_URL` with the Worker URL (the Worker already allows the `github.io` origin through `ALLOWED_ORIGINS` in `wrangler.toml`). Without it the Pages copy still works but shows contact and sign-in as "not connected".

### Custom domain

Add the domain in the Cloudflare dashboard (Workers > your worker > Settings > Domains). The build is host-agnostic (relative asset paths, hash routing), so `dist/` also runs on any other static host.

## How the CMS is protected

The site is static, so the UI can't be trusted to keep secrets. Every rule is enforced in the API (`server/src/app.ts`) and covered by tests:

| Who | Can |
| --- | --- |
| Anyone | read published content, send a message (validated, rate limited, honeypot) |
| Signed-in visitor | read and write **only their own** profile and progress |
| Owner | needs **both** an allow-listed email **and** a second factor (TOTP) **on that session**. Then: edit content, read the inbox, list friends, upload media |

- Being allow-listed without the second factor grants nothing. Having the second factor without being allow-listed grants nothing.
- Codes are single use, expire in 10 minutes, lock after 5 wrong tries, and are stored only as salted hashes. Session tokens are stored only as SHA-256 hashes; owner sessions last 12 hours, visitor sessions 30 days.
- The authenticator secret is encrypted at rest (AES-GCM) and can't be replaced once verified. Codes can't be replayed, and guessing is capped at 5 attempts per 5 minutes.
- Uploads are sniffed by their bytes, so a page disguised as an image is refused. Media is served with `nosniff` and a sandbox policy.
- The site ships a strict Content-Security-Policy (`server/csp.json`). The browser test fails if the policy blocks anything the site needs.

`npm test` includes tests for each of these. They were themselves checked by deliberately weakening the code and confirming the tests fail.

**If you lose your authenticator:** `npx wrangler d1 execute portfolio --remote --command "DELETE FROM owner_totp"`, then sign in and enrol a new one.

## Content

Everything on the page is data in `src/content/content.json`, which is the fallback and the seed. Once the owner publishes from the CMS, the database copy takes over and visitors see it immediately. Without a backend the CMS runs in local mode: changes stay in your browser, and **Download JSON** gives you a file to commit over `src/content/content.json`.

## Layout

```
src/content/content.json   default content
src/theme/                 five palettes x light/dark
src/sections/  src/games/  page sections and the arcade
src/components/            nav, dock, dialogs, tile wall, easter eggs, console
src/admin/                 schema-driven CMS, guard and inbox
src/store/  src/lib/       state, API client, sound, icons
server/src/app.ts          the API (runs on Workers and on Node)
server/schema.sql          database tables
server/test/               API + TOTP tests
wrangler.toml              Cloudflare config
e2e/                       browser tests
```

## Stack

React 19, TypeScript, Vite, Tailwind v4, Radix UI, Vaul, cmdk, Motion, three.js, Howler, Hono, Cloudflare Workers and D1, Vitest, Playwright.

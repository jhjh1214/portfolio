# portfolio

Lim Jun Hong's portfolio, built as a Steam-style profile page: a tile-wall header, a game library of projects, achievements, an arcade, hidden things to find, a contact form, passwordless sign-in for visitors, and a CMS that only the owner can use.

**Live:** https://jhjh1214.github.io/portfolio/

## What's in it

- **Visitors** pick a palette (five, each with light and dark) like choosing a Steam profile background. They can sign in with just an email: a one-time 6-digit code every time, no password. Their XP, achievements, scores and theme then follow them across devices.
- **Contact** form with email and an optional WhatsApp number (validated to international format).
- **Owner CMS** at `/#/admin`: edit every section, upload photos, read the inbox (with email and WhatsApp reply links), see who has signed in, and publish instantly with no redeploy.
- **Phones** treat each section as a page: swipe or tap the bottom dock and it snaps to the next tab.
- **Hidden achievements** work on keyboard and touch. `secrets` in the console lists hints; each locked achievement also shows how to find it on a phone.
- Sound effects are Kenney's CC0 Interface Sounds, played with Howler. See `/#/colophon` for all credits.

## Stack

React 19, TypeScript, Vite, Tailwind v4, Radix UI, Vaul, cmdk, Motion, three.js (react-three-fiber), Howler, react-hook-form and zod, Supabase (Postgres, Auth, Realtime, Storage), Vitest, Playwright.

## Run it

```bash
npm install
npm run dev          # the site; works with no backend (contact and sign-in show "not connected")
npm run typecheck
npm test             # unit tests
npm run build
```

### With a backend

The site talks to Supabase. Without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` it still works; it just can't take messages or sign people in.

**Locally** (needs Docker, about 100 MB of images):

```bash
npm run backend:up                       # Postgres, GoTrue auth, PostgREST, a mail catcher, migrations applied
node supabase/local/keys.mjs > .env.local
npm run dev                              # sign-in emails appear at http://localhost:54324
npm run test:backend                     # 40 security checks against the real database
npm run build && npx vite preview --port 4173
npm run test:e2e                         # 35 browser checks: sign-in, contact, owner + 2FA, phone gestures
```

**In production** (free tier is enough):

1. Create a project at supabase.com.
2. SQL editor: run `supabase/migrations/0001_init.sql`.
3. SQL editor: `insert into public.owner_emails (email) values ('you@example.com');` using your own email. Do this in the dashboard only, never in a file.
4. Authentication > Email Templates: paste `supabase/email-template.html` into **both** "Confirm sign up" and "Magic Link". This is what makes the email carry the code.
5. Authentication > SMTP: set a real sender (Resend, Brevo, Postmark...). Supabase's built-in mailer allows only a couple of emails an hour, which is not enough for visitors.
6. Copy the project URL and anon key into `.env.local`, and into GitHub: Settings > Secrets and variables > Actions > **Variables** as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. (Both are public by design.)
7. Push. Then open `/#/admin`, sign in with your owner email, and scan the QR code once to set up two-step verification.

## How the CMS is protected

The site is static, so the UI can't be trusted to keep secrets. Every protection lives in the database (`supabase/migrations/0001_init.sql`) as row-level security:

| Who | Can |
| --- | --- |
| Anyone | read published content, send a message (rate limited, validated) |
| Signed-in visitor | read and write **only their own** profile and progress |
| Owner | needs **both** an allow-listed email **and** a second factor (TOTP). Then: edit content, read the inbox, list friends, upload media |

Being allow-listed without two-step verification grants nothing. Having two-step verification without being allow-listed grants nothing. `npm run test:backend` tries to break each rule (forged tokens, spoofed sender IDs, email-change hijack, visitors reading each other, and so on), and was itself checked by deliberately weakening the rules and confirming the tests fail.

**If you lose your authenticator:** in the Supabase dashboard, Authentication > Users, delete the MFA factor for your user, then sign in and enrol again.

## Content

Everything on the page is data in `src/content/content.json`, which is the fallback and the seed. Once the owner publishes from the CMS, the database copy takes over and visitors see it immediately.

Without a backend the CMS runs in local mode: changes stay in your browser, and **Download JSON** gives you a file to commit over `src/content/content.json`.

## Hosting

`.github/workflows/deploy.yml` typechecks, tests, builds and deploys to GitHub Pages on every push to `main`. The build is host-agnostic: relative asset paths and hash routing mean `dist/` runs unchanged on any static host or a custom domain. For a custom domain add `public/CNAME` and point DNS at your host.

## Layout

```
src/content/content.json   default content and schema seed
src/theme/                 five palettes x light/dark
src/sections/              page sections        src/games/    arcade
src/components/            nav, dock, dialogs, tile wall, easter eggs, console
src/admin/                 schema-driven CMS, guard and inbox
src/store/                 content, visitor progress, auth, UI state
src/lib/                   pure logic (unit tested), sound, icons, messages
supabase/                  schema + RLS, email template, local test stack
e2e/                       browser tests
```

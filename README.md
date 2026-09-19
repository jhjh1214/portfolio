# portfolio

Lim Jun Hong's interactive portfolio: a Steam-profile-style React site with a built-in CMS, a 3D hero, an arcade and a lot of hidden things.

**Live:** https://jhjh1214.github.io/portfolio/

## Stack

React 19 · TypeScript · Vite · Tailwind v4 · Motion (animations) · three.js / react-three-fiber / drei (3D hero) · zustand · Vitest

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm test
npm run build
```

## Editing content (no code)

Open **`/#/admin`** (the small "backstage" link in the footer, or `sudo admin` in the site's console).

- Every section is editable: profile, theme colours, section order/visibility, projects, journey, achievements, open source, skills, albums (with image upload), hidden-achievement text and site settings.
- A **live preview** pane mirrors your edits as you type.
- Edits are stored as a **draft in your browser** until published.
- **Publish** commits `src/content/content.json` to this repo through the GitHub API, which triggers the deploy workflow. You paste a fine-grained personal access token (Contents: read & write on this repo only). It is kept in memory unless you tick "remember", and it never leaves your browser except to `api.github.com`.
- **Download / Import JSON** lets you back up or edit content by hand. If you would rather not use a token, download the JSON, replace `src/content/content.json`, and push.

Uploaded photos are compressed and embedded in `content.json` as data URLs. That is fine for a handful; for many photos, host them elsewhere and paste URLs.

## Deploying

`.github/workflows/deploy.yml` typechecks, tests, builds and deploys to GitHub Pages on every push to `main`.

The build is **host-agnostic**: relative asset paths (`base: './'`) and hash routing, so `dist/` runs unchanged on any static host or a custom domain. For a custom domain, add `public/CNAME` containing the domain and point DNS at your host.

## Structure

```
src/content/content.json   all site content (what the CMS edits)
src/types.ts               content schema
src/store/                 content (draft over published) and visitor progress (XP, achievements, scores)
src/sections/              page sections        src/games/  arcade minigames
src/three/                 3D hero scene        src/admin/  schema-driven CMS
src/lib/                   pure logic (unit tested)
```

Adding a new **collection** to the CMS means: add its type, add a schema in `src/admin/fields.ts`, and add one `ListEditor` line in `AdminApp.tsx`.

## Easter eggs

There are fifteen hidden achievements and eight hidden bugs. `secrets` in the console lists hints for what's left. No spoilers here.

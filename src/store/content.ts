import { create } from 'zustand'
import base from '../content/content.json'
import type { Content } from '../types'
import { normalizeContent } from '../lib/normalize'

const DRAFT_KEY = 'pf.draft'
const REMOTE_KEY = 'pf.remote'
export const published = base as unknown as Content

function read(key: string): Content | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? normalizeContent(published, JSON.parse(raw)) : null
  } catch {
    return null
  }
}
function write(key: string, d: Content | null) {
  try {
    if (d) localStorage.setItem(key, JSON.stringify(d))
    else localStorage.removeItem(key)
  } catch {
    /* quota or blocked storage: stays in memory only */
  }
}

interface ContentState {
  /** Content the owner saved to the database (cached locally for instant paint). */
  remote: Content | null
  /** Unsaved edits made in the CMS on this device. */
  draft: Content | null
  setRemote: (raw: unknown) => void
  update: (fn: (c: Content) => void) => void
  replace: (raw: unknown) => void
  discard: () => void
}

export const useContent = create<ContentState>((set, get) => ({
  remote: read(REMOTE_KEY),
  draft: read(DRAFT_KEY),
  setRemote: (raw) => {
    const next = raw ? normalizeContent(published, raw) : null
    write(REMOTE_KEY, next)
    set({ remote: next })
  },
  update: (fn) => {
    const next = structuredClone(get().draft ?? get().remote ?? published)
    fn(next)
    write(DRAFT_KEY, next)
    set({ draft: next })
  },
  replace: (raw) => {
    const next = normalizeContent(published, raw)
    write(DRAFT_KEY, next)
    set({ draft: next })
  },
  discard: () => {
    write(DRAFT_KEY, null)
    set({ draft: null })
  },
}))

/** What the site renders: local draft, else the owner's saved content, else what was bundled at build time. */
export const useC = () => useContent((s) => s.draft ?? s.remote ?? published)

// The admin's live-preview iframe shares this origin: mirror draft edits across documents.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === DRAFT_KEY) useContent.setState({ draft: read(DRAFT_KEY) })
  })
}

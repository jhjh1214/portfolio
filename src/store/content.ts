import { create } from 'zustand'
import base from '../content/content.json'
import type { Content } from '../types'
import { normalizeContent } from '../lib/normalize'

const DRAFT_KEY = 'pf.draft'
export const published = base as unknown as Content

function readDraft(): Content | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? normalizeContent(published, JSON.parse(raw)) : null
  } catch {
    return null
  }
}
function writeDraft(d: Content | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
    else localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* quota or blocked storage: draft stays in memory only */
  }
}

interface ContentState {
  draft: Content | null
  /** Mutate a clone of the current content; the result becomes the draft. */
  update: (fn: (c: Content) => void) => void
  replace: (raw: unknown) => void
  discard: () => void
}

export const useContent = create<ContentState>((set, get) => ({
  draft: readDraft(),
  update: (fn) => {
    const next = structuredClone(get().draft ?? published)
    fn(next)
    writeDraft(next)
    set({ draft: next })
  },
  replace: (raw) => {
    const next = normalizeContent(published, raw)
    writeDraft(next)
    set({ draft: next })
  },
  discard: () => {
    writeDraft(null)
    set({ draft: null })
  },
}))

/** The content the site renders: the local draft if any, else what was published. */
export const useC = () => useContent((s) => s.draft ?? published)
export const hasDraft = () => useContent((s) => s.draft !== null)

// The admin's live-preview iframe shares this origin: mirror draft edits across documents.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === DRAFT_KEY) useContent.setState({ draft: readDraft() })
  })
}

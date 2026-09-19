import { create } from 'zustand'
import { useContent, published } from './content'
import { sfx, setMuted } from '../lib/sound'
import type { EggDef, Mode, ThemeId } from '../types'

const KEY = 'pf.progress'

export interface Persisted {
  eggs: Record<string, number>
  xp: number
  muted: boolean
  scores: Record<string, number>
  played: string[]
  seen: string[]
  bugs: string[]
  theme: ThemeId | null
  mode: Mode | null
}
interface ProgressState extends Persisted {
  unlock: (id: string) => boolean
  addXp: (n: number) => void
  setScore: (game: string, score: number, lowerIsBetter?: boolean) => boolean
  markPlayed: (game: string) => void
  markSeen: (section: string) => void
  findBug: (id: string) => void
  toggleMute: () => void
  setTheme: (t: ThemeId | null) => void
  setMode: (m: Mode | null) => void
  mergeRemote: (remote: Partial<Persisted> | null) => void
  reset: () => void
}

const LOWER_IS_BETTER = new Set(['memory'])
const empty: Persisted = { eggs: {}, xp: 0, muted: false, scores: {}, played: [], seen: [], bugs: [], theme: null, mode: null }

function read(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...empty, ...JSON.parse(raw) } : { ...empty }
  } catch {
    return { ...empty }
  }
}
export const pick = (s: Persisted): Persisted => ({
  eggs: s.eggs, xp: s.xp, muted: s.muted, scores: s.scores, played: s.played, seen: s.seen, bugs: s.bugs, theme: s.theme, mode: s.mode,
})

/** Combine two progress snapshots without losing anything either side earned. */
export function mergeProgress(a: Persisted, b: Partial<Persisted> | null): Persisted {
  if (!b) return a
  const scores = { ...(b.scores ?? {}) }
  for (const [k, v] of Object.entries(a.scores)) {
    const other = scores[k]
    scores[k] = other === undefined ? v : LOWER_IS_BETTER.has(k) ? Math.min(v, other) : Math.max(v, other)
  }
  const eggs = { ...(b.eggs ?? {}) }
  for (const [k, t] of Object.entries(a.eggs)) eggs[k] = eggs[k] ? Math.min(eggs[k], t) : t
  const union = (x: string[], y?: string[]) => Array.from(new Set([...(y ?? []), ...x]))
  return {
    ...a,
    eggs,
    scores,
    xp: Math.max(a.xp, b.xp ?? 0),
    played: union(a.played, b.played),
    seen: union(a.seen, b.seen),
    bugs: union(a.bugs, b.bugs),
    theme: a.theme ?? b.theme ?? null,
    mode: a.mode ?? b.mode ?? null,
  }
}

type UnlockListener = (def: EggDef) => void
const listeners = new Set<UnlockListener>()
export const onUnlock = (cb: UnlockListener) => { listeners.add(cb); return () => { listeners.delete(cb) } }

const initial = read()
setMuted(initial.muted)

export const useProgress = create<ProgressState>((set, get) => {
  const commit = (patch: Partial<ProgressState>) => {
    set(patch)
    try { localStorage.setItem(KEY, JSON.stringify(pick(get()))) } catch { /* storage blocked */ }
  }
  return {
    ...initial,
    unlock: (id) => {
      if (get().eggs[id]) return false
      const eggs = (useContent.getState().draft ?? useContent.getState().remote ?? published).eggs
      const def = eggs.find((e) => e.id === id)
      if (!def) return false
      sfx.unlock()
      commit({ eggs: { ...get().eggs, [id]: Date.now() }, xp: get().xp + def.xp })
      listeners.forEach((l) => l(def))
      return true
    },
    addXp: (n) => commit({ xp: get().xp + n }),
    setScore: (game, score, lowerIsBetter = LOWER_IS_BETTER.has(game)) => {
      const cur = get().scores[game]
      const better = cur === undefined || (lowerIsBetter ? score < cur : score > cur)
      if (better) commit({ scores: { ...get().scores, [game]: score } })
      return better
    },
    markPlayed: (game) => { if (!get().played.includes(game)) commit({ played: [...get().played, game] }) },
    markSeen: (section) => { if (!get().seen.includes(section)) commit({ seen: [...get().seen, section] }) },
    findBug: (id) => { if (!get().bugs.includes(id)) commit({ bugs: [...get().bugs, id], xp: get().xp + 10 }) },
    toggleMute: () => { const muted = !get().muted; setMuted(muted); commit({ muted }) },
    setTheme: (theme) => commit({ theme }),
    setMode: (mode) => commit({ mode }),
    mergeRemote: (remote) => commit(mergeProgress(pick(get()), remote)),
    reset: () => commit({ ...empty }),
  }
})

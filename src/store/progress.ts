import { create } from 'zustand'
import { useContent, published } from './content'
import { sfx, setMuted } from '../lib/sound'
import type { Rarity } from '../types'

const KEY = 'pf.progress'

export interface Toast {
  id: string
  icon: string
  title: string
  desc: string
  rarity: Rarity
}
interface Persisted {
  eggs: Record<string, number>
  xp: number
  muted: boolean
  scores: Record<string, number>
  played: string[]
  seen: string[]
  bugs: string[]
  themeName: string | null
}
interface ProgressState extends Persisted {
  toasts: Toast[]
  unlock: (id: string) => boolean
  addXp: (n: number) => void
  setScore: (game: string, score: number, lowerIsBetter?: boolean) => boolean
  markPlayed: (game: string) => void
  markSeen: (section: string) => void
  findBug: (id: string) => void
  toggleMute: () => void
  setThemeName: (n: string | null) => void
  dismissToast: (id: string) => void
  reset: () => void
}

const empty: Persisted = { eggs: {}, xp: 0, muted: false, scores: {}, played: [], seen: [], bugs: [], themeName: null }

function read(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...empty, ...JSON.parse(raw) } : { ...empty }
  } catch {
    return { ...empty }
  }
}
function persist(s: ProgressState) {
  const { eggs, xp, muted, scores, played, seen, bugs, themeName } = s
  try {
    localStorage.setItem(KEY, JSON.stringify({ eggs, xp, muted, scores, played, seen, bugs, themeName }))
  } catch {
    /* ignore */
  }
}

const initial = read()
setMuted(initial.muted)

export const useProgress = create<ProgressState>((set, get) => {
  const commit = (patch: Partial<ProgressState>) => {
    set(patch)
    persist(get())
  }
  return {
    ...initial,
    toasts: [],
    unlock: (id) => {
      if (get().eggs[id]) return false
      const eggs = useContent.getState().draft?.eggs ?? published.eggs
      const def = eggs.find((e) => e.id === id)
      if (!def) return false
      sfx.unlock()
      commit({
        eggs: { ...get().eggs, [id]: Date.now() },
        xp: get().xp + def.xp,
        toasts: [...get().toasts, { id: `${id}-${Date.now()}`, icon: def.icon, title: def.title, desc: def.description, rarity: def.rarity }],
      })
      return true
    },
    addXp: (n) => commit({ xp: get().xp + n }),
    setScore: (game, score, lowerIsBetter = false) => {
      const cur = get().scores[game]
      const better = cur === undefined || (lowerIsBetter ? score < cur : score > cur)
      if (better) commit({ scores: { ...get().scores, [game]: score } })
      return better
    },
    markPlayed: (game) => {
      if (!get().played.includes(game)) commit({ played: [...get().played, game] })
    },
    markSeen: (section) => {
      if (!get().seen.includes(section)) commit({ seen: [...get().seen, section] })
    },
    findBug: (id) => {
      if (get().bugs.includes(id)) return
      commit({ bugs: [...get().bugs, id], xp: get().xp + 10 })
    },
    toggleMute: () => {
      const muted = !get().muted
      setMuted(muted)
      commit({ muted })
    },
    setThemeName: (themeName) => commit({ themeName }),
    dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
    reset: () => {
      commit({ ...empty, toasts: [] })
    },
  }
})

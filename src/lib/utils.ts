export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export const uid = (p = 'id') => `${p}-${Math.random().toString(36).slice(2, 8)}`
export const RARITY_COLOR = {
  common: '#94a3b8',
  uncommon: '#22c55e',
  rare: '#38bdf8',
  epic: '#a855f7',
  legendary: '#f59e0b',
} as const
export const RARITY_PCT = { common: 42.1, uncommon: 18.6, rare: 6.3, epic: 2.4, legendary: 0.4 } as const
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

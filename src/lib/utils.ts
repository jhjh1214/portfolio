export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export const uid = (p = 'id') => `${p}-${Math.random().toString(36).slice(2, 8)}`
export const RARITY_COLOR = {
  common: '#8a96a3',
  uncommon: '#3fa35b',
  rare: '#3b82d6',
  epic: '#9b5de5',
  legendary: '#e8a020',
} as const
export const RARITY_PCT = { common: 42.1, uncommon: 18.6, rare: 6.3, epic: 2.4, legendary: 0.4 } as const
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export const TONE_VAR = { teal: 'var(--primary)', coral: 'var(--accent)', sun: 'var(--sun)', cobalt: 'var(--cobalt)' } as const

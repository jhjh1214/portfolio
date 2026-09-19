import { useC } from '../store/content'
import { useProgress } from '../store/progress'
import { resolveMode, themeById } from './palettes'
import type { ThemeId } from '../types'

/** The palette actually in effect: the visitor's pick if the site offers it, else the site default. */
export function useThemeState() {
  const cfg = useC().theme
  const pick = useProgress((s) => s.theme)
  const mode = useProgress((s) => s.mode)
  const id: ThemeId = pick && cfg.offered.includes(pick) ? pick : cfg.defaultTheme
  const resolved = resolveMode(mode ?? cfg.defaultMode)
  return { id, mode: resolved, neon: themeById(id).fx === 'neon' && resolved === 'dark', cyber: id === 'cyber' }
}

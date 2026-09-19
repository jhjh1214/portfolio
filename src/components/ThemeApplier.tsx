import { useEffect } from 'react'
import { useC } from '../store/content'
import { useProgress } from '../store/progress'
import { applyTheme } from '../theme/palettes'

/** Applies the visitor's chosen palette and mode, falling back to the site's defaults. Follows the OS in "system" mode. */
export function ThemeApplier() {
  const t = useC().theme
  const theme = useProgress((s) => s.theme)
  const mode = useProgress((s) => s.mode)
  useEffect(() => {
    const id = theme && t.offered.includes(theme) ? theme : t.defaultTheme
    const m = mode ?? t.defaultMode
    applyTheme(id, m)
    if (m !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => applyTheme(id, 'system')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [theme, mode, t.defaultTheme, t.defaultMode, t.offered])
  return null
}

import { useEffect } from 'react'
import { useC } from '../store/content'
import { useProgress } from '../store/progress'
import { PRESETS } from '../lib/themes'

/** Writes the CMS theme (plus any terminal preset) into CSS variables. */
export function ThemeApplier() {
  const theme = useC().theme
  const name = useProgress((s) => s.themeName)
  useEffect(() => {
    const t = { ...theme, ...(name ? PRESETS[name] : {}) }
    const s = document.documentElement.style
    s.setProperty('--bg', t.bg)
    s.setProperty('--surface', t.surface)
    s.setProperty('--primary', t.primary)
    s.setProperty('--secondary', t.secondary)
    s.setProperty('--accent', t.accent)
    s.setProperty('--text', t.text)
    s.setProperty('--muted', t.muted)
    s.setProperty('--font-body', t.font === 'mono' ? "'JetBrains Mono', ui-monospace, monospace" : "'Space Grotesk', system-ui, sans-serif")
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg)
  }, [theme, name])
  return null
}

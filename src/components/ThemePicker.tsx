import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { Modal } from './kit'
import { useUI } from '../store/ui'
import { useC } from '../store/content'
import { useProgress } from '../store/progress'
import { THEMES, resolveMode } from '../theme/palettes'
import { cx } from '../lib/utils'
import { play } from '../lib/sound'
import type { Mode } from '../types'

const MODES: { id: Mode; label: string; Icon: typeof Sun }[] = [
  { id: 'system', label: 'System', Icon: Monitor },
  { id: 'light', label: 'Light', Icon: Sun },
  { id: 'dark', label: 'Dark', Icon: Moon },
]

/** Like choosing a Steam profile background: pick a palette, then light or dark. */
export function ThemePicker() {
  const open = useUI((s) => s.theme)
  const setOpen = useUI((s) => s.setTheme)
  const cfg = useC().theme
  const theme = useProgress((s) => s.theme) ?? cfg.defaultTheme
  const mode = useProgress((s) => s.mode) ?? cfg.defaultMode
  const setTheme = useProgress((s) => s.setTheme)
  const setMode = useProgress((s) => s.setMode)
  const resolved = resolveMode(mode)
  const offered = THEMES.filter((t) => cfg.offered.includes(t.id))

  return (
    <Modal open={open} onOpenChange={setOpen} title="Profile theme" description="Make this page yours. Your pick is remembered, and follows you if you sign in." wide>
      <div role="radiogroup" aria-label="Colour mode" className="mb-6 inline-flex rounded-xl border-[1.5px] border-line bg-raised p-1">
        {MODES.map(({ id, label, Icon }) => (
          <button key={id} role="radio" aria-checked={mode === id} onClick={() => { setMode(id); play('toggle') }} className={cx('flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors', mode === id ? 'bg-ink text-bg' : 'text-muted hover:text-ink')}>
            <Icon size={16} aria-hidden /> {label}
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label="Palette" className="grid gap-3 sm:grid-cols-2">
        {offered.map((t) => {
          const p = t[resolved]
          const on = theme === t.id
          return (
            <button key={t.id} role="radio" aria-checked={on} onClick={() => { setTheme(t.id); play('select') }} className={cx('card lift overflow-hidden text-left', on && '!border-ink shadow-[0_4px_0_var(--ink)]')}>
              <div className="flex h-14" aria-hidden>
                {[p.bg, p.surface, p.primary, p.accent, p.sun].map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)}
              </div>
              <div className="flex items-start justify-between gap-2 p-3">
                <div><div className="font-display font-bold">{t.name}</div><div className="text-sm text-muted">{t.blurb}</div></div>
                {on && <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-bg"><Check size={14} /></span>}
              </div>
            </button>
          )
        })}
      </div>
      <button className="btn btn-ghost mt-5" onClick={() => { setTheme(null); setMode(null); play('toggle') }}>Reset to the site default</button>
    </Modal>
  )
}

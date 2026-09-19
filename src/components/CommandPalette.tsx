import { useEffect } from 'react'
import { Command } from 'cmdk'
import { Bell, CornerDownLeft, LogIn, LogOut, Palette, Send, Terminal as TermIcon, Volume2, VolumeX } from 'lucide-react'
import { useUI } from '../store/ui'
import { useC } from '../store/content'
import { useAuth } from '../store/auth'
import { useProgress } from '../store/progress'
import { useFx } from '../store/fx'
import { THEMES } from '../theme/palettes'
import { Icon } from '../lib/icons'
import { SECTION_ICON } from './SectionShell'
import { backendOn } from '../lib/supabase'
import { play } from '../lib/sound'

const item = 'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-[.95rem] data-[selected=true]:bg-ink data-[selected=true]:text-bg'

/** Command menu (Ctrl or Cmd + K). Also the touch-friendly way into the console. */
export function CommandPalette() {
  const open = useUI((s) => s.palette)
  const setOpen = useUI((s) => s.setPalette)
  const c = useC()
  const session = useAuth((s) => s.session)
  const signOut = useAuth((s) => s.signOut)
  const setAuth = useUI((s) => s.setAuth)
  const setThemeOpen = useUI((s) => s.setTheme)
  const muted = useProgress((s) => s.muted)
  const toggleMute = useProgress((s) => s.toggleMute)
  const setTheme = useProgress((s) => s.setTheme)
  const setTerminal = useFx((s) => s.setTerminal)

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(!useUI.getState().palette) } }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [setOpen])
  useEffect(() => { play(open ? 'open' : 'close') }, [open])

  const run = (fn: () => void) => () => { setOpen(false); setTimeout(fn, 120) }
  const go = (id: string) => run(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }))

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Command menu" overlayClassName="fixed inset-0 z-[80] bg-black/50" contentClassName="card fixed left-1/2 top-[12vh] z-[81] w-[min(94vw,36rem)] -translate-x-1/2 overflow-hidden p-2 shadow-2xl">
      <Command.Input placeholder="Jump to a section or run a command" className="field mb-2 !border-0 !bg-transparent !text-lg !shadow-none" />
      <Command.List className="max-h-[60vh] overflow-y-auto p-1">
        <Command.Empty className="p-6 text-center text-muted">Nothing matches. Try "theme" or "projects".</Command.Empty>
        <Command.Group heading="Go to" className="text-xs font-semibold text-muted [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
          {c.sections.filter((s) => s.visible).map((s) => (
            <Command.Item key={s.id} value={`go ${s.label} ${s.title}`} onSelect={go(s.id)} className={item}><Icon name={SECTION_ICON[s.id]} size={18} />{s.title}<CornerDownLeft size={14} className="ml-auto opacity-50" /></Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Appearance" className="text-xs font-semibold text-muted [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
          <Command.Item value="open theme picker palette" onSelect={run(() => setThemeOpen(true))} className={item}><Palette size={18} />Choose a profile theme</Command.Item>
          {THEMES.filter((t) => c.theme.offered.includes(t.id)).map((t) => (
            <Command.Item key={t.id} value={`theme ${t.name}`} onSelect={run(() => setTheme(t.id))} className={item}><Palette size={18} />Theme: {t.name}</Command.Item>
          ))}
          <Command.Item value="toggle sound mute" onSelect={run(toggleMute)} className={item}>{muted ? <Volume2 size={18} /> : <VolumeX size={18} />}{muted ? 'Turn sound on' : 'Turn sound off'}</Command.Item>
        </Command.Group>
        <Command.Group heading="Actions" className="text-xs font-semibold text-muted [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
          <Command.Item value="send message contact" onSelect={go('contact')} className={item}><Send size={18} />Send me a message</Command.Item>
          {backendOn && !session && <Command.Item value="sign in register add friend" onSelect={run(() => setAuth(true))} className={item}><LogIn size={18} />Sign in or add friend</Command.Item>}
          {backendOn && session && <Command.Item value="sign out" onSelect={run(() => void signOut())} className={item}><LogOut size={18} />Sign out</Command.Item>}
          <Command.Item value="open console terminal shell" onSelect={run(() => setTerminal(true))} className={item}><TermIcon size={18} />Open the console</Command.Item>
          <Command.Item value="notifications inbox" onSelect={run(() => { location.hash = '#/admin' })} className={item} keywords={['owner', 'backstage']}><Bell size={18} />Backstage (owner)</Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useSpring } from 'motion/react'
import { Bell, Palette, Search, UserRound, Volume2, VolumeX } from 'lucide-react'
import { useC } from '../store/content'
import { useAuth } from '../store/auth'
import { useUI } from '../store/ui'
import { useFx } from '../store/fx'
import { useProgress } from '../store/progress'
import { unreadCount } from '../lib/messages'
import { Icon } from '../lib/icons'
import { Tip } from './kit'
import { SECTION_ICON } from './SectionShell'
import { backendOn } from '../lib/api'
import { cx } from '../lib/utils'
import { play } from '../lib/sound'

export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState('')
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-40% 0px -55% 0px' })
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [ids.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  return active
}

const scrollTo = (id: string) => { play('whoosh'); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }

export function Nav() {
  const c = useC()
  const secs = c.sections.filter((s) => s.visible)
  const active = useActiveSection(secs.map((s) => s.id))
  const { scrollYProgress } = useScroll()
  const bar = useSpring(scrollYProgress, { stiffness: 140, damping: 26 })
  const session = useAuth((s) => s.session)
  const owner = useAuth((s) => s.owner)
  const name = useAuth((s) => s.displayName)
  const unread = unreadCount()
  const muted = useProgress((s) => s.muted)
  const toggleMute = useProgress((s) => s.toggleMute)
  const setAuth = useUI((s) => s.setAuth)
  const setTheme = useUI((s) => s.setTheme)
  const setPalette = useUI((s) => s.setPalette)
  const setTerminal = useFx((s) => s.setTerminal)
  const unlock = useProgress((s) => s.unlock)
  const taps = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Five quick taps on the logo open the console. The touch route to a keyboard-only easter egg.
  const logo = (e: React.MouseEvent) => {
    e.preventDefault()
    clearTimeout(tapTimer.current)
    taps.current += 1
    play('tick', { rate: 1 + taps.current * 0.1 })
    if (taps.current >= 5) { taps.current = 0; unlock('terminal'); setTerminal(true) }
    else { tapTimer.current = setTimeout(() => { taps.current = 0 }, 1200); scrollTo('top') }
  }

  return (
    <>
      {/* Same width as every section (.wrap), so the pill's edges line up with the content below it. */}
      <nav className="glass glass-strong glass-refract wrap fixed inset-x-0 top-3 z-50 flex h-14 items-center gap-1 rounded-2xl px-2" aria-label="Main">
        <a href="#top" onClick={logo} aria-label="Home. Tap five times for a surprise." className="glitch grid h-10 shrink-0 place-items-center rounded-xl px-3 font-display text-xl font-extrabold">LJ<span className="text-accent">.</span></a>
        <div className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex">
          {secs.map((s) => (
            <Tip key={s.id} label={s.label}>
              <a href={`#${s.id}`} onClick={(e) => { e.preventDefault(); scrollTo(s.id) }} aria-label={s.label} aria-current={active === s.id ? 'true' : undefined}
                className={cx('flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors xl:px-3', active === s.id ? 'bg-ink text-bg' : 'text-muted hover:bg-ink/10 hover:text-ink')}>
                <Icon name={SECTION_ICON[s.id]} size={17} className="xl:hidden" />
                <span className={cx(active === s.id ? 'inline' : 'hidden', 'xl:inline')}>{s.label}</span>
              </a>
            </Tip>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
          <Tip label="Search and commands (Ctrl K)"><button className="btn btn-ghost btn-icon !min-h-10 !w-10" onClick={() => setPalette(true)} aria-label="Open command menu"><Search size={18} /></button></Tip>
          <Tip label="Profile theme"><button className="btn btn-ghost btn-icon !min-h-10 !w-10" onClick={() => setTheme(true)} aria-label="Choose profile theme"><Palette size={18} /></button></Tip>
          <Tip label={muted ? 'Sound off' : 'Sound on'}><button className="btn btn-ghost btn-icon !min-h-10 !w-10" onClick={toggleMute} aria-label={muted ? 'Turn sound on' : 'Turn sound off'} aria-pressed={!muted}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button></Tip>
          {owner && (
            <Tip label="Inbox"><Link to="/admin" className="btn btn-ghost btn-icon relative !min-h-10 !w-10" aria-label={`Inbox, ${unread} unread`}><Bell size={18} />{unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">{unread}</span>}</Link></Tip>
          )}
          {backendOn && (
            <button className="btn btn-sm ml-1 !min-h-10" onClick={() => setAuth(true)}>{session ? <><span className="grid h-5 w-5 place-items-center rounded-full bg-on-primary text-[11px] font-extrabold text-primary">{(name || session.user.email || '?')[0].toUpperCase()}</span><span className="hidden sm:inline">{name || 'Account'}</span></> : <><UserRound size={16} aria-hidden /><span className="hidden sm:inline">Sign in</span></>}</button>
          )}
        </div>
      </nav>
      <motion.div className="fixed left-0 right-0 top-0 z-[49] h-[3px] origin-left bg-accent" style={{ scaleX: bar }} aria-hidden />
    </>
  )
}

/** Phone navigation: a floating dock. Each tab is a page, and one swipe moves to the next. */
export function Dock() {
  const c = useC()
  const secs = c.sections.filter((s) => s.visible)
  const active = useActiveSection(['top', ...secs.map((s) => s.id)])
  const items = [{ id: 'top', label: 'Profile', icon: 'users' }, ...secs.map((s) => ({ id: s.id, label: s.label, icon: SECTION_ICON[s.id] }))]
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }) }, [active])
  return (
    <nav className="glass glass-strong glass-refract wrap fixed inset-x-0 bottom-3 z-50 rounded-2xl p-1.5 lg:hidden" aria-label="Sections">
      <div ref={ref} className="no-scrollbar flex gap-1 overflow-x-auto">
        {items.map((it) => (
          <button key={it.id} aria-current={active === it.id ? 'true' : undefined} aria-label={it.label} onClick={() => scrollTo(it.id)}
            className={cx('flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-all', active === it.id ? 'bg-ink text-bg' : 'text-muted')}>
            <Icon name={it.icon} size={19} />{active === it.id && <span>{it.label}</span>}
          </button>
        ))}
      </div>
    </nav>
  )
}

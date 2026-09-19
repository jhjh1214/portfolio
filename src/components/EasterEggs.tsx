import { useEffect } from 'react'
import { useProgress } from '../store/progress'
import { useC } from '../store/content'
import { useFx, burst } from '../store/fx'
import { createSequenceMatcher, KONAMI, word } from '../lib/sequence'

const typingInField = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

/** Headless: global key/visibility/scroll triggers and progress-derived unlocks. */
export function EasterEggs({ enabled = true }: { enabled?: boolean }) {
  const c = useC()
  const unlock = useProgress((s) => s.unlock)
  const { bugs, seen, played } = useProgress()
  const play = useFx((s) => s.play)
  const setTerminal = useFx((s) => s.setTerminal)

  useEffect(() => {
    if (!enabled) return
    const konami = createSequenceMatcher(KONAMI)
    const flood = createSequenceMatcher(word('banjir'))
    const ship = createSequenceMatcher(word('shipit'))
    const onKey = (e: KeyboardEvent) => {
      if (typingInField(e.target)) return
      if (e.key === '`' || e.key === '~') { e.preventDefault(); const s = useFx.getState(); s.setTerminal(!s.terminal); return }
      if (e.key === 'Escape') { setTerminal(false); return }
      if (konami(e.key)) { unlock('konami'); burst(); play('matrix', 6000) }
      if (flood(e.key)) { unlock('flood'); play('flood', 5500) }
      if (ship(e.key)) { unlock('shipit'); burst() }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [enabled, unlock, play, setTerminal])

  // Night owl + tab-away title
  useEffect(() => {
    if (!enabled) return
    const h = new Date().getHours()
    if (h >= 0 && h < 5) unlock('night')
    const title = document.title
    const onVis = () => { document.title = document.hidden ? 'Come back 🥺 the bugs miss you' : title }
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); document.title = title }
  }, [enabled, unlock])

  // Idle at the very bottom for 8s
  useEffect(() => {
    if (!enabled) return
    let t: ReturnType<typeof setTimeout> | undefined
    const check = () => {
      clearTimeout(t)
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) t = setTimeout(() => unlock('grass'), 8000)
    }
    addEventListener('scroll', check, { passive: true })
    return () => { removeEventListener('scroll', check); clearTimeout(t) }
  }, [enabled, unlock])

  // Progress-derived achievements
  useEffect(() => {
    if (!enabled) return
    if (bugs.length >= c.site.bugCount && c.site.bugCount > 0) unlock('bugs')
    const visible = c.sections.filter((s) => s.visible).length
    if (visible > 0 && seen.length >= visible) unlock('explorer')
    if (played.length >= c.site.games.length && c.site.games.length > 0) unlock('arcade')
  }, [enabled, bugs.length, seen.length, played.length, c.site.bugCount, c.site.games.length, c.sections, unlock])

  return null
}

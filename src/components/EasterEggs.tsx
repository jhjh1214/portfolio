import { useEffect } from 'react'
import { useProgress } from '../store/progress'
import { useC } from '../store/content'
import { useFx, burst } from '../store/fx'
import { createSequenceMatcher, KONAMI, word } from '../lib/sequence'
import { play } from '../lib/sound'

const typingInField = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

const TOUCH_KONAMI = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'tap', 'tap']

/** Headless. Keyboard, touch and time based triggers, plus achievements derived from progress. */
export function EasterEggs({ enabled = true }: { enabled?: boolean }) {
  const c = useC()
  const unlock = useProgress((s) => s.unlock)
  const bugs = useProgress((s) => s.bugs)
  const seen = useProgress((s) => s.seen)
  const played = useProgress((s) => s.played)
  const fx = useFx((s) => s.play)
  const setTerminal = useFx((s) => s.setTerminal)

  const konami = () => { unlock('konami'); burst(); fx('matrix', 6000); play('glitch') }

  useEffect(() => {
    if (!enabled) return
    const kKey = createSequenceMatcher(KONAMI)
    const flood = createSequenceMatcher(word('banjir'))
    const ship = createSequenceMatcher(word('shipit'))
    const onKey = (e: KeyboardEvent) => {
      if (typingInField(e.target)) return
      if (e.key === '`' || e.key === '~') { e.preventDefault(); const s = useFx.getState(); s.setTerminal(!s.terminal); return }
      if (e.key === 'Escape') { setTerminal(false); return }
      if (kKey(e.key)) konami()
      if (flood(e.key)) { unlock('flood'); fx('flood', 5500); play('whoosh') }
      if (ship(e.key)) { unlock('shipit'); burst(); play('win') }
    }
    addEventListener('keydown', onKey)

    // Touch: swipe up, up, down, down, left, right, left, right, then tap twice.
    const kTouch = createSequenceMatcher(TOUCH_KONAMI)
    let start: { x: number; y: number; t: number } | null = null
    const onStart = (e: TouchEvent) => { start = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } }
    const onEnd = (e: TouchEvent) => {
      if (!start) return
      const dx = e.changedTouches[0].clientX - start.x
      const dy = e.changedTouches[0].clientY - start.y
      const dist = Math.max(Math.abs(dx), Math.abs(dy))
      let token: string | null = null
      if (dist < 12 && Date.now() - start.t < 300) token = 'tap'
      else if (dist > 50) token = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')
      start = null
      if (token && kTouch(token)) konami()
    }
    addEventListener('touchstart', onStart, { passive: true })
    addEventListener('touchend', onEnd, { passive: true })
    return () => { removeEventListener('keydown', onKey); removeEventListener('touchstart', onStart); removeEventListener('touchend', onEnd) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const h = new Date().getHours()
    if (h >= 0 && h < 5) unlock('night')
    const title = document.title
    const onVis = () => { document.title = document.hidden ? 'Come back, the bugs miss you' : title }
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); document.title = title }
  }, [enabled, unlock])

  useEffect(() => {
    if (!enabled) return
    let t: ReturnType<typeof setTimeout> | undefined
    const check = () => {
      clearTimeout(t)
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 6) t = setTimeout(() => unlock('grass'), 8000)
    }
    addEventListener('scroll', check, { passive: true })
    return () => { removeEventListener('scroll', check); clearTimeout(t) }
  }, [enabled, unlock])

  useEffect(() => {
    if (!enabled) return
    if (bugs.length >= c.site.bugCount && c.site.bugCount > 0) unlock('bugs')
    const visible = c.sections.filter((s) => s.visible).length
    if (visible > 0 && seen.length >= visible) unlock('explorer')
    if (played.length >= c.site.games.length && c.site.games.length > 0) unlock('arcade')
  }, [enabled, bugs.length, seen.length, played.length, c.site.bugCount, c.site.games.length, c.sections, unlock])

  return null
}

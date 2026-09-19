import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
import { animate, motion, useInView } from 'motion/react'
import { Dialog as D, Tooltip as T, Switch as S } from 'radix-ui'
import { Drawer } from 'vaul'
import { Bug, X } from 'lucide-react'
import type { Rarity } from '../types'
import { RARITY_COLOR, cx, prefersReducedMotion } from '../lib/utils'
import { useProgress } from '../store/progress'
import { play } from '../lib/sound'

export function useMediaQuery(q: string) {
  const [m, setM] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches)
  useEffect(() => {
    const mq = matchMedia(q)
    const on = () => setM(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [q])
  return m
}
export const useIsMobile = () => useMediaQuery('(max-width: 767px)')

/** Centered dialog on desktop, bottom sheet on phones. Both trap focus, close on Escape, and restore focus. */
export function Modal({ open, onOpenChange, title, description, children, wide }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: ReactNode; wide?: boolean
}) {
  const mobile = useIsMobile()
  useEffect(() => { play(open ? 'open' : 'close') }, [open])
  if (mobile) {
    return (
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[80] bg-black/55" />
          <Drawer.Content className="glass fixed inset-x-0 bottom-0 z-[81] flex max-h-[92svh] flex-col rounded-t-[24px] outline-none" style={{ background: 'var(--surface)' }}>
            <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-line" aria-hidden />
            <div className="overflow-y-auto px-5 pb-8 pt-4">
              <Drawer.Title className="font-display text-2xl font-bold">{title}</Drawer.Title>
              {description ? <Drawer.Description className="mt-1 text-sm text-muted">{description}</Drawer.Description> : <Drawer.Description className="sr-only">{title}</Drawer.Description>}
              <div className="mt-4">{children}</div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-[pop_.15s_ease-out]" />
        <D.Content className={cx('card fixed left-1/2 top-1/2 z-[81] max-h-[88vh] w-[min(94vw,var(--w))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-6 shadow-2xl outline-none data-[state=open]:animate-[pop_.2s_cubic-bezier(.3,1.4,.5,1)]')} style={{ ['--w' as string]: wide ? '46rem' : '30rem' }}>
          <D.Close className="btn btn-ghost btn-icon absolute right-3 top-3 !min-h-9 !w-9" aria-label="Close"><X size={18} /></D.Close>
          <D.Title className="font-display pr-10 text-2xl font-bold">{title}</D.Title>
          {description ? <D.Description className="mt-1 text-sm text-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          <div className="mt-5">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

export function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <T.Provider delayDuration={250}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content sideOffset={8} className="z-[90] rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-bg shadow-lg">
            {label}
            <T.Arrow className="fill-ink" />
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  )
}

export function Switch({ checked, onCheckedChange, label }: { checked: boolean; onCheckedChange: (c: boolean) => void; label: string }) {
  return (
    <S.Root checked={checked} onCheckedChange={onCheckedChange} aria-label={label} className="relative h-7 w-12 shrink-0 rounded-full border-[1.5px] border-line bg-raised transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary">
      <S.Thumb className="block h-5 w-5 translate-x-[3px] rounded-full bg-ink transition-transform data-[state=checked]:translate-x-[23px] data-[state=checked]:bg-on-primary" />
    </S.Root>
  )
}

export function RarityChip({ rarity }: { rarity: Rarity }) {
  const c = RARITY_COLOR[rarity]
  return (
    <span className="chip capitalize" style={{ borderColor: c, color: 'var(--ink)', background: `color-mix(in srgb, ${c} 22%, var(--surface))` }}>
      <span className="h-2 w-2 rounded-full" style={{ background: c }} aria-hidden />
      {rarity}
    </span>
  )
}

export function CountUp({ to, className }: { to: number | string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const num = typeof to === 'number' ? to : Number(to)
  const isNum = Number.isFinite(num) && String(to).trim() !== ''
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!inView || !isNum) return
    if (prefersReducedMotion()) { setV(num); return }
    const c = animate(0, num, { duration: 1.1, ease: 'easeOut', onUpdate: (n) => setV(Math.round(n)) })
    return () => c.stop()
  }, [inView, num, isNum])
  return <span ref={ref} className={className}>{isNum ? v : to}</span>
}

export function Typewriter({ lines, className }: { lines: string[]; className?: string }) {
  const [i, setI] = useState(0)
  const [n, setN] = useState(0)
  const [del, setDel] = useState(false)
  const line = lines[i % Math.max(lines.length, 1)] ?? ''
  useEffect(() => {
    if (!lines.length) return
    if (prefersReducedMotion()) { setN(line.length); return }
    const t = setTimeout(() => {
      if (!del && n < line.length) setN(n + 1)
      else if (!del) setDel(true)
      else if (n > 0) setN(n - 1)
      else { setDel(false); setI((i + 1) % lines.length) }
    }, !del && n === line.length ? 1800 : del ? 20 : 45)
    return () => clearTimeout(t)
  }, [n, del, line, i, lines.length])
  return <span className={cx('cursor', className)} aria-label={line}>{line.slice(0, n)}</span>
}

/** A bug hidden on the page. Big tap target, wiggles, squishes when found. */
export function HiddenBug({ id, className }: { id: string; className?: string }) {
  const found = useProgress((s) => s.bugs.includes(id))
  const findBug = useProgress((s) => s.findBug)
  const [squish, setSquish] = useState(false)
  if (found && !squish) return null
  return (
    <motion.button
      aria-label="A suspicious bug. Tap to squash it."
      className={cx('absolute z-20 grid h-11 w-11 place-items-center text-accent', className)}
      animate={squish ? { scale: [1, 1.7, 0], rotate: 400, opacity: [1, 1, 0] } : {}}
      transition={{ duration: 0.45 }}
      onClick={() => { play('hit'); setSquish(true); findBug(id); setTimeout(() => setSquish(false), 480) }}
    >
      <Bug size={20} className="bug-hidden" />
    </motion.button>
  )
}

export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  componentDidCatch(e: Error, i: ErrorInfo) { console.warn('Boundary caught', e, i.componentStack) }
  render() { return this.state.err ? (this.props.fallback ?? null) : this.props.children }
}

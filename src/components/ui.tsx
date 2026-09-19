import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
import { animate, motion, useInView, useMotionValue, useSpring, useTransform } from 'motion/react'
import type { Rarity } from '../types'
import { RARITY_COLOR, RARITY_PCT, cx, prefersReducedMotion } from '../lib/utils'
import { useProgress } from '../store/progress'
import { sfx } from '../lib/sound'

export function RarityBadge({ rarity, pct = false }: { rarity: Rarity; pct?: boolean }) {
  const c = RARITY_COLOR[rarity]
  return (
    <span className="chip" style={{ color: c }}>
      {rarity}
      {pct && <span className="opacity-70">· {RARITY_PCT[rarity]}%</span>}
    </span>
  )
}

/** 3D pointer-tilt wrapper. */
export function Tilt({ children, className, max = 8 }: { children: ReactNode; className?: string; max?: number }) {
  const x = useMotionValue(0.5)
  const y = useMotionValue(0.5)
  const rx = useSpring(useTransform(y, [0, 1], [max, -max]), { stiffness: 200, damping: 20 })
  const ry = useSpring(useTransform(x, [0, 1], [-max, max]), { stiffness: 200, damping: 20 })
  return (
    <motion.div
      className={className}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (prefersReducedMotion() || e.pointerType === 'touch') return
        const r = e.currentTarget.getBoundingClientRect()
        x.set((e.clientX - r.left) / r.width)
        y.set((e.clientY - r.top) / r.height)
      }}
      onPointerLeave={() => { x.set(0.5); y.set(0.5) }}
    >
      {children}
    </motion.div>
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
    const c = animate(0, num, { duration: 1.4, ease: 'easeOut', onUpdate: (n) => setV(Math.round(n)) })
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
    const still = prefersReducedMotion()
    if (still) { setN(line.length); return }
    const t = setTimeout(
      () => {
        if (!del && n < line.length) setN(n + 1)
        else if (!del) setDel(true)
        else if (n > 0) setN(n - 1)
        else { setDel(false); setI((i + 1) % lines.length) }
      },
      !del && n === line.length ? 1600 : del ? 22 : 48,
    )
    return () => clearTimeout(t)
  }, [n, del, line, i, lines.length])
  return <span className={cx('cursor', className)}>{line.slice(0, n)}</span>
}

/** skillicons.dev slug or emoji, with a text fallback if the CDN is unreachable. */
export function SkillIcon({ icon, name, size = 28 }: { icon: string; name: string; size?: number }) {
  const [bad, setBad] = useState(false)
  const isSlug = /^[a-z0-9-]+$/i.test(icon)
  if (!isSlug || bad)
    return (
      <span style={{ fontSize: size * 0.8, width: size, height: size }} className="inline-flex items-center justify-center" aria-hidden>
        {isSlug ? name.slice(0, 2).toUpperCase() : icon}
      </span>
    )
  return <img src={`https://skillicons.dev/icons?i=${icon}`} width={size} height={size} alt="" loading="lazy" onError={() => setBad(true)} />
}

/** A bug hidden somewhere on the page. Squish it to count it. */
export function HiddenBug({ id, className }: { id: string; className?: string }) {
  const found = useProgress((s) => s.bugs.includes(id))
  const findBug = useProgress((s) => s.findBug)
  const [squish, setSquish] = useState(false)
  if (found && !squish) return null
  return (
    <motion.button
      aria-label="A suspicious bug"
      className={cx('bug-hidden absolute z-20 select-none text-lg', className)}
      animate={squish ? { scale: [1, 1.8, 0], rotate: 540, opacity: [1, 1, 0] } : {}}
      transition={{ duration: 0.5 }}
      onClick={() => { sfx.hit(); setSquish(true); findBug(id); setTimeout(() => setSquish(false), 520) }}
    >
      🐛
    </motion.button>
  )
}

export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  componentDidCatch(e: Error, i: ErrorInfo) { console.warn('Boundary caught', e, i.componentStack) }
  render() { return this.state.err ? (this.props.fallback ?? null) : this.props.children }
}

export function useLockScroll(active: boolean) {
  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [active])
}

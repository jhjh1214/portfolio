import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useMotionValue, useSpring } from 'motion/react'
import { cx, prefersReducedMotion } from '../lib/utils'
import { hasBrand, TechIcon } from '../lib/icons'
import { useC } from '../store/content'

const fine = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: fine)').matches

/** 3D tilt with a specular glare that follows the pointer. Desktop only; a no-op on touch and with reduced motion. */
export function Tilt({ children, className, radius = 'rounded-[18px]', max = 7 }: { children: ReactNode; className?: string; radius?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const rx = useSpring(useMotionValue(0), { stiffness: 220, damping: 20 })
  const ry = useSpring(useMotionValue(0), { stiffness: 220, damping: 20 })
  return (
    <motion.div
      ref={ref}
      className={cx('glare', radius, className)}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || prefersReducedMotion()) return
        const r = e.currentTarget.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width
        const py = (e.clientY - r.top) / r.height
        ry.set((px - 0.5) * 2 * max)
        rx.set(-(py - 0.5) * 2 * max)
        const el = ref.current!
        el.style.setProperty('--gx', `${px * 100}%`)
        el.style.setProperty('--gy', `${py * 100}%`)
        el.style.setProperty('--glare', '1')
      }}
      onPointerLeave={() => { rx.set(0); ry.set(0); ref.current?.style.setProperty('--glare', '0') }}
    >
      {children}
    </motion.div>
  )
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&*+'
/** Headline that decodes into place when it scrolls into view. Screen readers always get the real text. */
export function Scramble({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.7 })
  const [out, setOut] = useState(text)
  useEffect(() => {
    if (!seen || prefersReducedMotion()) return
    let frame = 0
    const total = 16
    const id = setInterval(() => {
      frame += 1
      const reveal = Math.floor((text.length * frame) / total)
      setOut(text.split('').map((ch, i) => (ch === ' ' || i < reveal ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join(''))
      if (frame >= total) { clearInterval(id); setOut(text) }
    }, 32)
    return () => clearInterval(id)
  }, [seen, text])
  return <span ref={ref} className={className} aria-label={text}><span aria-hidden>{out}</span></span>
}

/** Pulls its child a little toward the pointer. */
export function Magnetic({ children, strength = 0.28 }: { children: ReactNode; strength?: number }) {
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 18 })
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 18 })
  return (
    <motion.div
      className="inline-flex"
      style={{ x, y }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || prefersReducedMotion()) return
        const r = e.currentTarget.getBoundingClientRect()
        x.set((e.clientX - (r.left + r.width / 2)) * strength)
        y.set((e.clientY - (r.top + r.height / 2)) * strength)
      }}
      onPointerLeave={() => { x.set(0); y.set(0) }}
    >
      {children}
    </motion.div>
  )
}

/** A soft light that follows the cursor, over everything. Off on touch devices and with reduced motion. */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!fine() || prefersReducedMotion()) return
    const el = ref.current!
    let raf = 0
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => { el.style.setProperty('--mx', `${e.clientX}px`); el.style.setProperty('--my', `${e.clientY}px`); el.style.setProperty('--cg', '.75') })
    }
    const out = () => el.style.setProperty('--cg', '0')
    addEventListener('pointermove', move, { passive: true })
    document.addEventListener('mouseleave', out)
    return () => { removeEventListener('pointermove', move); document.removeEventListener('mouseleave', out); cancelAnimationFrame(raf) }
  }, [])
  return <div ref={ref} className="cursor-glow" aria-hidden />
}

/** Two counter-scrolling rows: the motto and the tools. Pauses on hover; still with reduced motion. */
export function Ticker() {
  const c = useC()
  const tools = c.skills.flatMap((g) => g.skills).filter((s) => hasBrand(s.icon))
  const words = ['Build', 'Verify', 'Ship', 'Repeat']
  const still = prefersReducedMotion()
  const row = (children: ReactNode, reverse = false, dur = 46) => (
    <div className="marquee-wrap overflow-hidden py-3" style={{ maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)' }}>
      <div className={cx('marquee', reverse && 'reverse')} style={{ ['--dur' as string]: `${dur}s`, animationPlayState: still ? 'paused' : undefined }}>{children}{children}</div>
    </div>
  )
  const motto = Array.from({ length: 6 }, (_, k) => (
    <span key={k} className="flex shrink-0 items-center">
      {words.map((w) => <span key={w} className="font-display px-5 text-4xl font-extrabold sm:text-5xl" style={{ WebkitTextStroke: '1.5px var(--ink)', color: 'transparent' }}>{w}<span className="text-accent" style={{ WebkitTextStroke: 0 }}>.</span></span>)}
    </span>
  ))
  const chips = tools.map((t, k) => <span key={`${t.name}${k}`} className="mx-4 flex shrink-0 items-center gap-2 text-muted"><TechIcon name={t.icon} size={22} /><span className="font-semibold">{t.name}</span></span>)
  return (
    <div className="border-y-[1.5px] border-line bg-surface/60 py-2" aria-hidden>
      {row(<>{motto}</>, false, 60)}
      {row(<>{chips}</>, true, 50)}
    </div>
  )
}

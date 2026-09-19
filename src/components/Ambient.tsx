import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useThemeState } from '../theme/useTheme'
import { prefersReducedMotion } from '../lib/utils'
import { play } from '../lib/sound'

/** Cyberpunk theme only: a drifting starfield, two slow colour blooms and the odd shooting star. */
export function AmbientFx() {
  const { neon } = useThemeState()
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!neon || prefersReducedMotion()) return
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    const css = getComputedStyle(document.documentElement)
    const col = (n: string) => css.getPropertyValue(n).trim()
    const [primary, accent, cyan] = [col('--primary'), col('--accent'), col('--sun')]
    let w = 0, h = 0, raf = 0, last = 0, mx = 0.5, my = 0.5, shoot: { x: number; y: number; life: number } | null = null
    const dpr = Math.min(devicePixelRatio, 1.5)
    const stars = Array.from({ length: 150 }, () => ({ x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8, p: Math.random() * 6.28 }))
    const resize = () => { w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0) }
    resize()
    const onMove = (e: PointerEvent) => { mx = e.clientX / w; my = e.clientY / h }
    const bloom = (x: number, y: number, r: number, c: string, a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `color-mix(in srgb, ${c} ${a * 100}%, transparent)`)
      g.addColorStop(1, 'transparent')
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame)
      if (document.hidden || t - last < 33) return // about 30 fps
      last = t
      ctx.clearRect(0, 0, w, h)
      bloom(w * (0.2 + 0.06 * Math.sin(t / 5200)), h * (0.25 + 0.05 * Math.cos(t / 4300)), Math.max(w, h) * 0.5, primary, 0.22)
      bloom(w * (0.85 + 0.05 * Math.cos(t / 6100)), h * (0.75 + 0.06 * Math.sin(t / 5000)), Math.max(w, h) * 0.45, accent, 0.16)
      for (const s of stars) {
        s.y -= 0.00006 * s.z
        if (s.y < 0) { s.y = 1; s.x = Math.random() }
        const tw = 0.5 + 0.5 * Math.sin(t / 700 + s.p)
        ctx.globalAlpha = (0.25 + 0.65 * tw) * s.z
        ctx.fillStyle = s.z > 0.85 ? cyan : '#e2e8f0'
        const px = s.x * w + (mx - 0.5) * 28 * s.z, py = s.y * h + (my - 0.5) * 20 * s.z
        ctx.fillRect(px, py, 1 + s.z * 1.4, 1 + s.z * 1.4)
      }
      ctx.globalAlpha = 1
      if (!shoot && Math.random() < 0.004) shoot = { x: Math.random() * w * 0.7, y: Math.random() * h * 0.4, life: 0 }
      if (shoot) {
        shoot.life += 0.03; shoot.x += 14; shoot.y += 6
        const g = ctx.createLinearGradient(shoot.x - 90, shoot.y - 40, shoot.x, shoot.y)
        g.addColorStop(0, 'transparent'); g.addColorStop(1, accent)
        ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.globalAlpha = 1 - shoot.life
        ctx.beginPath(); ctx.moveTo(shoot.x - 90, shoot.y - 40); ctx.lineTo(shoot.x, shoot.y); ctx.stroke(); ctx.globalAlpha = 1
        if (shoot.life >= 1) shoot = null
      }
    }
    raf = requestAnimationFrame(frame)
    addEventListener('resize', resize)
    addEventListener('pointermove', onMove, { passive: true })
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); removeEventListener('pointermove', onMove) }
  }, [neon])

  if (!neon) return null
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 -z-10 h-full w-full" aria-hidden />
}

const LINES = ['> boot LJ.SYS 2.0', '> mounting projects ........... ok', '> loading achievements ........ ok', '> calibrating tile wall ....... ok', '> ready.']

/** Cyberpunk theme: a short boot sequence, once per browser session. Any key, click or tap skips it. */
export function BootSplash() {
  const { cyber } = useThemeState()
  const [open, setOpen] = useState(false)
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!cyber || prefersReducedMotion()) return
    try { if (sessionStorage.getItem('pf.boot')) return; sessionStorage.setItem('pf.boot', '1') } catch { return }
    setOpen(true); play('glitch')
    const timers = LINES.map((_, i) => setTimeout(() => setN(i + 1), 260 * (i + 1)))
    timers.push(setTimeout(() => setOpen(false), 260 * LINES.length + 500))
    return () => timers.forEach(clearTimeout)
  }, [cyber])

  useEffect(() => {
    if (!open) return
    const skip = () => setOpen(false)
    addEventListener('keydown', skip); addEventListener('pointerdown', skip)
    return () => { removeEventListener('keydown', skip); removeEventListener('pointerdown', skip) }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[120] grid place-items-center bg-[#02040d] p-6 font-mono text-[#67e8f9]" initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.45 }} role="status" aria-label="Loading the profile. Press any key to skip.">
          <div className="w-full max-w-md text-sm leading-7 sm:text-base">
            {LINES.slice(0, n).map((l, i) => <div key={l} className={i === n - 1 ? 'text-[#ec4899]' : ''}>{l}</div>)}
            <span className="inline-block h-4 w-2 bg-[#67e8f9] align-middle" style={{ animation: 'boot-caret 1s steps(1) infinite' }} />
            <div className="mt-6 text-xs text-[#8b5cf6]">press any key to skip</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

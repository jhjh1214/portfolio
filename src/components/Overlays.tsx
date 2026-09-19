import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useFx } from '../store/fx'

function MatrixRain() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    const dpr = Math.min(devicePixelRatio, 2)
    const resize = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.scale(dpr, dpr) }
    resize()
    const css = getComputedStyle(document.documentElement)
    const bg = css.getPropertyValue('--bg').trim()
    const fg = css.getPropertyValue('--primary').trim()
    const size = 16
    const drops = Array.from({ length: Math.ceil(innerWidth / size) }, () => Math.random() * -50)
    const glyphs = '01<>/{}[];=+*#'
    const id = setInterval(() => {
      ctx.globalAlpha = 0.14; ctx.fillStyle = bg; ctx.fillRect(0, 0, innerWidth, innerHeight); ctx.globalAlpha = 1
      ctx.fillStyle = fg; ctx.font = `${size}px monospace`
      drops.forEach((y, i) => {
        ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * size, y * size)
        drops[i] = y * size > innerHeight && Math.random() > 0.975 ? 0 : y + 1
      })
    }, 45)
    addEventListener('resize', resize)
    return () => { clearInterval(id); removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[70] h-full w-full" aria-hidden />
}

function Flood() {
  return (
    <motion.div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 1 } }} aria-hidden>
      <motion.div className="absolute inset-x-0 bottom-0" initial={{ height: '0%' }} animate={{ height: '78%' }} transition={{ duration: 3.2, ease: 'easeOut' }} style={{ background: 'color-mix(in srgb, var(--cobalt) 62%, transparent)', backdropFilter: 'blur(2px)' }}>
        <div className="absolute -top-3 inset-x-0 h-4" style={{ background: 'radial-gradient(circle at 20px 16px, transparent 12px, color-mix(in srgb, var(--cobalt) 80%, white) 13px) 0 0/40px 16px repeat-x', animation: 'wave 2s linear infinite' }} />
        <div className="absolute inset-x-0 top-10 text-center font-display text-5xl font-extrabold text-white sm:text-7xl">Banjir!</div>
        <div className="absolute inset-x-0 top-28 text-center text-base text-white/80 sm:top-36">Don't worry, it recedes.</div>
      </motion.div>
    </motion.div>
  )
}

export function Overlays() {
  const fx = useFx((s) => s.fx)
  return (
    <>
      <AnimatePresence>{fx === 'matrix' && <MatrixRain key="m" />}</AnimatePresence>
      <AnimatePresence>{fx === 'flood' && <Flood key="f" />}</AnimatePresence>
    </>
  )
}

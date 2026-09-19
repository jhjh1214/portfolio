import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useFx } from '../store/fx'

function MatrixRain() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    const resize = () => { cv.width = innerWidth; cv.height = innerHeight }
    resize()
    const size = 16
    const drops = Array.from({ length: Math.ceil(innerWidth / size) }, () => Math.random() * -50)
    const glyphs = '01ｱｲｳｴｵｶｷｸｹｺ⛓{}<>/;=+*'
    const id = setInterval(() => {
      ctx.fillStyle = 'rgba(2,10,4,.13)'
      ctx.fillRect(0, 0, cv.width, cv.height)
      ctx.fillStyle = '#4ade80'
      ctx.font = `${size}px monospace`
      drops.forEach((y, i) => {
        ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * size, y * size)
        drops[i] = y * size > cv.height && Math.random() > 0.975 ? 0 : y + 1
      })
    }, 45)
    addEventListener('resize', resize)
    return () => { clearInterval(id); removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[70]" />
}

function Flood() {
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[70] overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 1 } }}
    >
      <motion.div
        className="absolute inset-x-0 bottom-0"
        initial={{ height: '0%' }}
        animate={{ height: '78%' }}
        transition={{ duration: 3.2, ease: 'easeOut' }}
        style={{ background: 'linear-gradient(180deg, rgb(14 165 233 / .42), rgb(3 105 161 / .72))', backdropFilter: 'blur(2px) hue-rotate(10deg)' }}
      >
        <div
          className="absolute -top-3 inset-x-0 h-4"
          style={{
            background: 'radial-gradient(circle at 20px 16px, transparent 12px, rgb(56 189 248 / .6) 13px) 0 0/40px 16px repeat-x',
            animation: 'wave 2s linear infinite',
          }}
        />
        <div className="absolute inset-x-0 top-8 text-center font-display text-3xl font-bold text-white/90 sm:text-5xl">🌊 BANJIR!</div>
        <div className="absolute inset-x-0 top-24 text-center text-sm text-white/70">(don't worry, it recedes)</div>
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

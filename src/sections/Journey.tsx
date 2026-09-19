import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'
import { useC } from '../store/content'
import { HiddenBug } from '../components/ui'

const KIND_COLOR = { start: '#22c55e', project: '#8b5cf6', award: '#f59e0b', oss: '#06b6d4', milestone: '#ec4899' } as const

export function Journey() {
  const c = useC()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 60%'] })
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 22 })
  const top = useTransform(p, [0, 1], ['0%', '100%'])

  return (
    <div ref={ref} className="relative mx-auto max-w-4xl">
      <HiddenBug id="b3" className="right-0 top-1/3" />
      <div className="absolute bottom-0 left-4 top-0 w-px bg-white/10 md:left-1/2" />
      <motion.div className="bg-grad absolute left-4 top-0 w-[2px] origin-top md:left-1/2" style={{ scaleY: p, height: '100%' }} />
      <motion.div className="absolute left-4 z-10 -translate-x-1/2 text-xl md:left-1/2" style={{ top }} aria-hidden>🐛</motion.div>

      <ol className="space-y-10">
        {c.journey.map((j, i) => {
          const left = i % 2 === 0
          const col = KIND_COLOR[j.kind]
          return (
            <li key={j.id} className="relative pl-12 md:grid md:grid-cols-2 md:gap-12 md:pl-0">
              <motion.div
                initial={{ opacity: 0, x: left ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.55 }}
                className={`panel panel-hover p-5 ${left ? 'md:col-start-1 md:text-right' : 'md:col-start-2'}`}
              >
                <span className="chip" style={{ color: col }}>{j.date}</span>
                <h3 className="font-display mt-2 text-lg font-bold">{j.title}</h3>
                <p className="mt-1 text-sm text-muted">{j.detail}</p>
              </motion.div>
              <div className="absolute left-4 top-5 z-[5] grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full border-2 bg-bg text-lg md:left-1/2" style={{ borderColor: col, boxShadow: `0 0 18px -2px ${col}` }}>
                {j.icon}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

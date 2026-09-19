import { useEffect, useRef, type ReactNode } from 'react'
import { motion, useInView } from 'motion/react'
import type { SectionConfig } from '../types'
import { useProgress } from '../store/progress'

export function SectionShell({ cfg, index, children }: { cfg: SectionConfig; index: number; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const seen = useInView(ref, { amount: 0.25 })
  const markSeen = useProgress((s) => s.markSeen)
  useEffect(() => { if (seen) markSeen(cfg.id) }, [seen, cfg.id, markSeen])

  return (
    <section ref={ref} id={cfg.id} className="relative mx-auto w-full max-w-6xl overflow-x-clip px-4 py-20 sm:px-6">
      <motion.header
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="mb-10"
      >
        <span className="chip text-primary">{String(index + 1).padStart(2, '0')} — {cfg.label}</span>
        <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
          <span className="text-grad">{cfg.title}</span>
        </h2>
        {cfg.subtitle && <p className="mt-2 max-w-2xl text-sm text-muted">{cfg.subtitle}</p>}
      </motion.header>
      {children}
    </section>
  )
}

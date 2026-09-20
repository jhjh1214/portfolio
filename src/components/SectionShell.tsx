import { useEffect, useRef, type ReactNode } from 'react'
import { motion, useInView } from 'motion/react'
import type { SectionConfig, SectionId } from '../types'
import { useProgress } from '../store/progress'
import { Icon } from '../lib/icons'
import { Scramble } from './fx'

export const SECTION_ICON: Record<SectionId, string> = {
  showcase: 'star', projects: 'gamepad', journey: 'rocket', achievements: 'trophy', opensource: 'git-merge',
  skills: 'layers', album: 'camera', arcade: 'puzzle', contact: 'message',
}
const TONES = ['var(--primary)', 'var(--accent)', 'var(--sun)', 'var(--cobalt)']

export function SectionShell({ cfg, index, children }: { cfg: SectionConfig; index: number; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const seen = useInView(ref, { amount: 0.3 })
  const markSeen = useProgress((s) => s.markSeen)
  useEffect(() => { if (seen) markSeen(cfg.id) }, [seen, cfg.id, markSeen])

  return (
    <section ref={ref} id={cfg.id} aria-labelledby={`${cfg.id}-title`} className="wrap relative py-16 md:py-24">
      <header className="mb-8 flex items-start gap-4 md:mb-12">
        <motion.span
          initial={{ scale: 0.7, rotate: -12 }} whileInView={{ scale: 1, rotate: 0 }} viewport={{ once: true, amount: 0.8 }} transition={{ type: 'spring', stiffness: 380, damping: 16 }}
          className="sec-icon mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-xl border-[1.5px] border-ink shadow-[0_4px_0_var(--ink)] md:h-14 md:w-14" style={{ background: TONES[index % 4], color: index % 4 === 2 ? '#1b1b1b' : '#fff' }}
        >
          <Icon name={SECTION_ICON[cfg.id]} size={24} />
        </motion.span>
        <div className="min-w-0">
          <h2 id={`${cfg.id}-title`} className="title-fx text-[2.2rem] font-extrabold leading-none sm:text-5xl"><Scramble text={cfg.title} /></h2>
          <motion.span aria-hidden className="mt-3 block h-[3px] origin-left rounded bg-accent" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, amount: 1 }} transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }} style={{ width: '4.5rem' }} />
          {cfg.subtitle && <p className="prose-tight mt-3 text-base text-muted">{cfg.subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

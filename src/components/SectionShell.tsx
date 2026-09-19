import { useEffect, useRef, type ReactNode } from 'react'
import { useInView } from 'motion/react'
import type { SectionConfig, SectionId } from '../types'
import { useProgress } from '../store/progress'
import { Icon } from '../lib/icons'

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
    <section ref={ref} id={cfg.id} aria-labelledby={`${cfg.id}-title`} className="snap-page relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <header className="mb-8 flex items-start gap-4 md:mb-12">
        <span className="mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-xl border-[1.5px] border-ink text-white shadow-[0_4px_0_var(--ink)] md:h-14 md:w-14" style={{ background: TONES[index % 4], color: index % 4 === 2 ? '#1b1b1b' : '#fff' }}>
          <Icon name={SECTION_ICON[cfg.id]} size={24} />
        </span>
        <div>
          <h2 id={`${cfg.id}-title`} className="text-[2.2rem] font-extrabold leading-none sm:text-5xl">{cfg.title}</h2>
          {cfg.subtitle && <p className="prose-tight mt-2 text-base text-muted">{cfg.subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

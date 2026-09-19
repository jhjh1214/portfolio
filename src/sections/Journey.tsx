import { useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'motion/react'
import { ArrowRight, Bug } from 'lucide-react'
import { useC } from '../store/content'
import { Icon } from '../lib/icons'
import { HiddenBug } from '../components/kit'
import { prefersReducedMotion } from '../lib/utils'

const KIND: Record<string, { label: string; color: string }> = {
  start: { label: 'Started', color: 'var(--primary)' },
  project: { label: 'Project', color: 'var(--cobalt)' },
  award: { label: 'Award', color: 'var(--sun)' },
  oss: { label: 'Open source', color: 'var(--accent)' },
  milestone: { label: 'Milestone', color: 'var(--primary)' },
}

/**
 * Steam-style activity feed. The spine fills as you scroll and a bug crawls down it, lighting each stop as it passes.
 * This is the one place a real sequence lives, so it gets a spine.
 */
export function Journey() {
  const c = useC()
  const ref = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 65%', 'end 55%'] })
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.6 })
  const top = useTransform(p, [0, 1], ['0%', '100%'])
  const wiggle = useTransform(p, (v) => 180 + Math.sin(v * 60) * 14) // faces down, with a walking sway
  const [passed, setPassed] = useState(0)
  const n = c.journey.length
  useMotionValueEvent(p, 'change', (v) => setPassed(Math.round(v * (n - 1)) + (v > 0.02 ? 1 : 0)))
  const still = prefersReducedMotion()

  return (
    <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <HiddenBug id="b3" className="-top-14 right-0" />
      <ol ref={ref} className="relative max-w-3xl">
        <span className="absolute bottom-6 left-[1.35rem] top-6 w-[3px] rounded bg-line" aria-hidden />
        <motion.span className="absolute bottom-6 left-[1.35rem] top-6 w-[3px] origin-top rounded bg-accent" style={{ scaleY: still ? 1 : p }} aria-hidden />
        {!still && (
          <div className="pointer-events-none absolute bottom-6 left-[1.35rem] top-6 w-0" aria-hidden>
            <motion.span className="absolute left-0 z-20 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[1.5px] border-ink bg-surface text-accent shadow-[0_3px_0_var(--ink)]" style={{ top }}>
              <motion.span style={{ rotate: wiggle }} className="grid place-items-center"><Bug size={17} strokeWidth={2.2} /></motion.span>
            </motion.span>
          </div>
        )}
        {c.journey.map((j, i) => {
          const k = KIND[j.kind] ?? KIND.milestone
          const lit = still || i < passed
          return (
            <li key={j.id} className="relative flex gap-4 pb-6 last:pb-0">
              <span
                className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full border-[1.5px] border-ink transition-[background-color,transform,box-shadow] duration-300"
                style={{ background: lit ? k.color : 'var(--surface)', color: lit ? (j.kind === 'award' ? '#1b1b1b' : '#fff') : 'var(--ink)', boxShadow: `0 3px 0 ${lit ? 'var(--ink)' : k.color}`, transform: lit ? 'scale(1)' : 'scale(.92)' }}
              >
                <Icon name={j.icon} size={20} />
              </span>
              <motion.div initial={{ opacity: 0.35, x: 14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-12% 0px' }} transition={{ duration: 0.35 }} className="card min-w-0 flex-1 p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-muted">{j.date}</span>
                  <span className="chip" style={{ borderColor: k.color }}>{k.label}</span>
                </div>
                <h3 className="mt-1.5 text-xl font-bold">{j.title}</h3>
                <p className="mt-1 text-muted">{j.detail}</p>
              </motion.div>
            </li>
          )
        })}
      </ol>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <section className="card p-5" aria-label="What's next">
          <h3 className="text-xl font-bold">What's next</h3>
          <ul className="mt-3 space-y-2.5">
            {c.profile.mission.map((m) => (
              <li key={m} className="flex gap-2.5"><ArrowRight size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />{m}</li>
            ))}
          </ul>
          <button className="btn btn-soft btn-sm mt-5" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>Work with me</button>
        </section>
      </aside>
    </div>
  )
}

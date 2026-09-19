import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { useC } from '../store/content'
import { Icon } from '../lib/icons'
import { HiddenBug } from '../components/kit'

const KIND: Record<string, { label: string; color: string }> = {
  start: { label: 'Started', color: 'var(--primary)' },
  project: { label: 'Project', color: 'var(--cobalt)' },
  award: { label: 'Award', color: 'var(--sun)' },
  oss: { label: 'Open source', color: 'var(--accent)' },
  milestone: { label: 'Milestone', color: 'var(--primary)' },
}

/** Steam-style activity feed. The one place a real sequence lives, so it gets a spine. */
export function Journey() {
  const c = useC()
  return (
    <div className="relative grid gap-8 lg:grid-cols-[1fr_20rem]">
      <HiddenBug id="b3" className="-top-14 right-0" />
      <ol className="relative max-w-3xl">
        <span className="absolute bottom-6 left-[1.35rem] top-6 w-[3px] rounded bg-line" aria-hidden />
        {c.journey.map((j) => {
          const k = KIND[j.kind] ?? KIND.milestone
          return (
            <li key={j.id} className="relative flex gap-4 pb-6 last:pb-0">
              <motion.span
                initial={{ scale: 0.6 }} whileInView={{ scale: 1 }} viewport={{ once: true, margin: '-30px' }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full border-[1.5px] border-ink bg-surface"
                style={{ boxShadow: `0 3px 0 ${k.color}` }}
              >
                <Icon name={j.icon} size={20} />
              </motion.span>
              <div className="card min-w-0 flex-1 p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-muted">{j.date}</span>
                  <span className="chip" style={{ borderColor: k.color }}>{k.label}</span>
                </div>
                <h3 className="mt-1.5 text-xl font-bold">{j.title}</h3>
                <p className="mt-1 text-muted">{j.detail}</p>
              </div>
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

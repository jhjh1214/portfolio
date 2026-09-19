import { motion } from 'motion/react'
import { useC } from '../store/content'
import { HiddenBug } from '../components/kit'
import { TechIcon } from '../lib/icons'

/** Ten pips instead of a smooth bar: reads like a game stat and stays honest about being approximate. */
function Pips({ level }: { level: number }) {
  const on = Math.round(level / 10)
  return (
    <div className="flex gap-[3px]" role="img" aria-label={`${on} out of 10`}>
      {Array.from({ length: 10 }, (_, i) => (
        <motion.span key={i} initial={{ scaleY: 0.3, opacity: 0.4 }} whileInView={{ scaleY: 1, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.03, duration: 0.25 }}
          className={`h-2.5 w-full rounded-[2px] ${i < on ? 'bg-primary' : 'bg-line'}`} />
      ))}
    </div>
  )
}

export function Skills() {
  const c = useC()
  return (
    <div className="relative">
      <HiddenBug id="b4" className="-top-14 left-1/2" />
      <div className="grid gap-6 lg:grid-cols-2">
        {c.skills.map((g) => (
          <section key={g.id} className="card p-5" aria-label={g.title}>
            <h3 className="mb-4 text-xl font-bold">{g.title}</h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {g.skills.map((s) => (
                <li key={s.name} className="card-raised group p-3 transition-transform hover:-translate-y-0.5">
                  <div className="flex items-center gap-2"><TechIcon name={s.icon} size={22} className="shrink-0 transition-transform group-hover:rotate-[-8deg] group-hover:scale-110" /><span className="truncate text-sm font-semibold">{s.name}</span></div>
                  <div className="mt-2.5"><Pips level={s.level} /></div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span className="label">Languages I speak</span>
        {c.profile.spoken.map((l) => <span key={l.language} className="chip !text-sm"><b>{l.language}</b> {l.level}</span>)}
      </div>
    </div>
  )
}

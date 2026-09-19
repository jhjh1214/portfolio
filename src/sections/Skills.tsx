import { motion } from 'motion/react'
import { useC } from '../store/content'
import { SkillIcon, HiddenBug } from '../components/ui'

export function Skills() {
  const c = useC()
  return (
    <div className="relative">
      <HiddenBug id="b4" className="-top-8 left-1/2" />
      <div className="grid gap-5 md:grid-cols-2">
        {c.skills.map((g, gi) => (
          <motion.div key={g.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: (gi % 2) * 0.1 }} className="panel p-5">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-[.2em] text-secondary">{g.title}</h3>
            <ul className="space-y-3">
              {g.skills.map((s) => (
                <li key={s.name} className="group flex items-center gap-3">
                  <div className="transition-transform group-hover:-rotate-12 group-hover:scale-125"><SkillIcon icon={s.icon} name={s.name} size={26} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-xs"><span className="font-bold">{s.name}</span><span className="text-muted">{s.level}</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <motion.div className="bg-grad h-full rounded-full" initial={{ width: 0 }} whileInView={{ width: `${s.level}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease: 'easeOut' }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-muted">Languages spoken</span>
        {c.profile.spoken.map((l) => (
          <span key={l.language} className="chip text-accent">{l.language} · {l.level}</span>
        ))}
      </div>
    </div>
  )
}

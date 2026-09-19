import { motion } from 'motion/react'
import { useC } from '../store/content'
import { CountUp, RarityBadge, Tilt, SkillIcon } from '../components/ui'
import { RARITY_COLOR } from '../lib/utils'

export function Showcase() {
  const c = useC()
  const award = c.achievements.find((a) => a.featured) ?? c.achievements[0]
  const proj = c.projects.find((p) => p.featured) ?? c.projects[0]
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {award && (
        <Tilt>
          <motion.article initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="panel holo relative h-full p-7" style={{ borderColor: RARITY_COLOR[award.rarity] + '99' }}>
            <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full opacity-30 blur-3xl" style={{ background: RARITY_COLOR[award.rarity] }} />
            <RarityBadge rarity={award.rarity} />
            <div className="mt-6 text-7xl" style={{ animation: 'float 4s ease-in-out infinite' }}>{award.icon}</div>
            <h3 className="font-display mt-4 text-2xl font-bold sm:text-3xl">{award.title}</h3>
            <p className="mt-1 text-xs uppercase tracking-widest text-accent">{award.issuer} · {award.date}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted">{award.description}</p>
          </motion.article>
        </Tilt>
      )}
      {proj && (
        <Tilt>
          <motion.article initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="panel relative h-full overflow-hidden p-7">
            <div className="absolute inset-0 opacity-25" style={{ background: `linear-gradient(135deg, ${proj.colorA}, transparent 70%)` }} />
            <div className="relative">
              <span className="chip text-secondary">Flagship project</span>
              <h3 className="font-display mt-4 text-3xl font-bold">{proj.emoji} {proj.title}</h3>
              <p className="mt-2 text-sm text-muted">{proj.tagline}</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {proj.highlights.map((h) => (
                  <div key={h.label} className="rounded-lg border border-white/10 bg-black/25 p-3">
                    <CountUp to={h.value} className="font-display text-2xl font-bold text-accent" />
                    <div className="text-[10px] uppercase tracking-widest text-muted">{h.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {proj.stack.map((s) => <SkillIcon key={s} icon={s} name={s} size={30} />)}
              </div>
              {proj.repo && (
                <a className="btn btn-primary mt-6" href={`https://github.com/${proj.repo}`} target="_blank" rel="noreferrer">Explore {proj.title}</a>
              )}
            </div>
          </motion.article>
        </Tilt>
      )}
    </div>
  )
}

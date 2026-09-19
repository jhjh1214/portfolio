import { ArrowUpRight } from 'lucide-react'
import { useC } from '../store/content'
import { CountUp, RarityChip } from '../components/kit'
import { Icon, TechIcon } from '../lib/icons'
import { TONE_VAR } from '../lib/utils'
import { TilePattern } from '../components/TileWall'

export function Showcase() {
  const c = useC()
  const award = c.achievements.find((a) => a.featured) ?? c.achievements[0]
  const proj = c.projects.find((p) => p.featured) ?? c.projects[0]
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {award && (
        <article className="relative flex flex-col overflow-hidden rounded-[22px] border-[1.5px] border-ink bg-sun p-7 text-[#1b1b1b] shadow-[0_6px_0_var(--ink)] sm:p-9">
          <svg className="absolute -right-10 -top-10 h-64 w-64 opacity-20" viewBox="0 0 48 48" aria-hidden>
            <rect x="8" y="8" width="32" height="32" fill="#1b1b1b" /><rect x="8" y="8" width="32" height="32" fill="#1b1b1b" transform="rotate(45 24 24)" />
          </svg>
          <div className="relative flex flex-1 flex-col">
            <div className="grid h-20 w-20 place-items-center rounded-2xl border-[1.5px] border-[#1b1b1b] bg-[#fff8e6]"><Icon name={award.icon} size={40} /></div>
            <h3 className="mt-6 text-[2rem] font-extrabold leading-[1.02] sm:text-[2.6rem]">{award.title}</h3>
            <p className="mt-4 max-w-[52ch] text-base leading-relaxed">{award.description}</p>
            <div className="mt-auto flex items-center justify-between gap-3 pt-8">
              <RarityChip rarity={award.rarity} />
              <span className="text-sm font-semibold">{award.issuer}, {award.date}</span>
            </div>
          </div>
        </article>
      )}
      {proj && (
        <article className="card relative flex flex-col overflow-hidden">
          <div className="relative h-40 overflow-hidden"><TilePattern tone={TONE_VAR[proj.tone]} kind={2} />
            <span className="absolute bottom-4 left-5 grid h-14 w-14 place-items-center rounded-xl border-[1.5px] border-ink bg-surface text-ink"><Icon name={proj.icon} size={28} /></span>
          </div>
          <div className="flex flex-1 flex-col p-7">
            <h3 className="text-3xl font-extrabold">{proj.title}</h3>
            <p className="mt-1 text-muted">{proj.tagline}</p>
            <dl className="mt-6 grid grid-cols-2 gap-3">
              {proj.highlights.map((h) => (
                <div key={h.label} className="card-raised p-3">
                  <dd className="font-display text-3xl font-extrabold"><CountUp to={h.value} /></dd>
                  <dt className="text-sm text-muted">{h.label}</dt>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-wrap gap-3 text-muted">{proj.stack.map((s) => <TechIcon key={s} name={s} size={26} />)}</div>
            {proj.repo && <a className="btn mt-auto w-fit" style={{ marginTop: '1.5rem' }} href={`https://github.com/${proj.repo}`} target="_blank" rel="noreferrer">View the source <ArrowUpRight size={18} aria-hidden /></a>}
          </div>
        </article>
      )}
    </div>
  )
}

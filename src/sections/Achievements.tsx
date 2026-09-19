import { motion } from 'motion/react'
import { Lock } from 'lucide-react'
import { useC } from '../store/content'
import { useProgress } from '../store/progress'
import { RarityChip, useMediaQuery } from '../components/kit'
import { Icon } from '../lib/icons'
import { RARITY_COLOR } from '../lib/utils'

export function Achievements() {
  const c = useC()
  const eggs = useProgress((s) => s.eggs)
  const touch = useMediaQuery('(pointer: coarse)')
  const found = c.eggs.filter((e) => eggs[e.id]).length
  const pct = (found / Math.max(1, c.eggs.length)) * 100
  return (
    <div className="space-y-14">
      <div>
        <h3 className="mb-4 text-2xl font-bold">Earned <span className="text-muted">({c.achievements.length})</span></h3>
        <ul className="grid gap-4 md:grid-cols-2">
          {c.achievements.map((a) => (
            <li key={a.id} className="card flex gap-4 p-4" style={{ borderLeft: `6px solid ${RARITY_COLOR[a.rarity]}` }}>
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border-[1.5px] bg-raised" style={{ borderColor: RARITY_COLOR[a.rarity] }}><Icon name={a.icon} size={30} /></span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h4 className="font-display text-lg font-bold leading-tight">{a.title}</h4><RarityChip rarity={a.rarity} /></div>
                <p className="mt-1 text-[.95rem] text-muted">{a.description}</p>
                <p className="mt-1.5 text-sm font-semibold">{a.issuer}, {a.date}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold">Hidden achievements</h3>
            <p className="mt-1 text-muted">{touch ? 'Each one lists how to find it on a phone.' : 'Hover a locked one for a hint.'}</p>
          </div>
          <div className="w-full max-w-xs">
            <div className="mb-1.5 flex justify-between text-sm font-semibold"><span>{found} of {c.eggs.length} found</span><span>{Math.round(pct)}%</span></div>
            <div className="h-3 overflow-hidden rounded-full border-[1.5px] border-line bg-raised" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Hidden achievements found">
              <motion.div className="h-full bg-accent" initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease: 'easeOut' }} />
            </div>
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {c.eggs.map((e) => {
            const got = !!eggs[e.id]
            return (
              <li key={e.id} className={`card flex items-start gap-3 p-3.5 ${got ? '' : 'bg-raised'}`} title={got ? e.title : undefined}>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[10px] border-[1.5px]" style={{ borderColor: got ? RARITY_COLOR[e.rarity] : 'var(--line)', background: got ? 'var(--surface)' : 'transparent' }}>
                  {got ? <Icon name={e.icon} size={22} /> : <Lock size={18} className="text-muted" aria-hidden />}
                </span>
                <div className="min-w-0">
                  <div className="font-display font-bold leading-tight">{got ? e.title : 'Hidden achievement'}</div>
                  <div className="mt-0.5 text-sm text-muted">{got ? e.description : touch ? e.touch : e.hint}</div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

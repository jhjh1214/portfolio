import { motion } from 'motion/react'
import { Lock } from 'lucide-react'
import { useC } from '../store/content'
import { useProgress } from '../store/progress'
import { RarityBadge } from '../components/ui'
import { RARITY_COLOR } from '../lib/utils'

export function Achievements() {
  const c = useC()
  const eggs = useProgress((s) => s.eggs)
  const found = c.eggs.filter((e) => eggs[e.id]).length
  return (
    <div className="space-y-12">
      <div>
        <h3 className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[.2em] text-muted">
          Earned <span className="text-accent">{c.achievements.length} unlocked</span>
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {c.achievements.map((a, i) => (
            <motion.article key={a.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: (i % 2) * 0.08 }}
              className="panel panel-hover flex gap-4 p-4" style={{ borderLeft: `3px solid ${RARITY_COLOR[a.rarity]}` }}>
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl text-3xl" style={{ background: `${RARITY_COLOR[a.rarity]}22`, border: `1px solid ${RARITY_COLOR[a.rarity]}77` }}>{a.icon}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-display text-base font-bold">{a.title}</h4>
                  <RarityBadge rarity={a.rarity} />
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{a.description}</p>
                <div className="mt-2 text-[10px] uppercase tracking-widest text-accent/80">{a.issuer} · {a.date}</div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-[.2em] text-muted">Hidden · found by you</h3>
          <div className="w-full max-w-xs">
            <div className="mb-1 flex justify-between text-[11px]"><span className="text-muted">{found} of {c.eggs.length}</span><span className="text-accent">{Math.round((found / Math.max(1, c.eggs.length)) * 100)}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div className="bg-grad h-full" initial={{ width: 0 }} whileInView={{ width: `${(found / Math.max(1, c.eggs.length)) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1 }} />
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {c.eggs.map((e) => {
            const got = !!eggs[e.id]
            return (
              <div key={e.id} className={`panel flex items-center gap-3 p-3 transition-opacity ${got ? '' : 'opacity-60 hover:opacity-100'}`} title={got ? e.title : `Hint: ${e.hint}`}>
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg text-xl" style={{ background: got ? `${RARITY_COLOR[e.rarity]}22` : 'rgb(255 255 255 / .05)', border: `1px solid ${got ? RARITY_COLOR[e.rarity] : 'rgb(255 255 255 / .12)'}` }}>
                  {got ? e.icon : <Lock size={16} className="text-muted" />}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{got ? e.title : 'Hidden achievement'}</div>
                  <div className="line-clamp-2 text-[11px] text-muted">{got ? e.description : e.hint}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

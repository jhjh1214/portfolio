import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ExternalLink, Search, Star, X } from 'lucide-react'
import { Github } from '../components/BrandIcons'
import { useC } from '../store/content'
import { Tilt, SkillIcon, useLockScroll, HiddenBug } from '../components/ui'
import { fetchRepos, type GhRepo } from '../lib/github'
import type { Project } from '../types'
import { cx } from '../lib/utils'

const STATUS: Record<Project['status'], { label: string; color: string }> = {
  live: { label: 'Live', color: '#22c55e' },
  shipped: { label: 'Shipped', color: '#38bdf8' },
  wip: { label: 'In development', color: '#f59e0b' },
  archived: { label: 'Archived', color: '#94a3b8' },
}

function Cover({ p, big }: { p: Project; big?: boolean }) {
  return (
    <div className={cx('relative overflow-hidden', big ? 'h-44' : 'h-32')} style={{ background: `linear-gradient(135deg, ${p.colorA}, ${p.colorB})` }}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
      <div className="absolute inset-0 grid place-items-center" style={{ fontSize: big ? 72 : 52, filter: 'drop-shadow(0 6px 14px rgb(0 0 0 / .5))' }}>{p.emoji}</div>
      <span className="chip absolute left-3 top-3 bg-black/40" style={{ color: STATUS[p.status].color }}>{STATUS[p.status].label}</span>
      <span className="absolute bottom-2 right-3 text-[10px] font-bold text-white/70">{p.year}</span>
    </div>
  )
}

function Modal({ p, gh, onClose }: { p: Project; gh?: GhRepo; onClose: () => void }) {
  useLockScroll(true)
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [onClose])
  return (
    <motion.div className="fixed inset-0 z-[85] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div role="dialog" aria-modal="true" aria-label={p.title} layoutId={`proj-${p.id}`} className="panel max-h-[90vh] w-full max-w-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <Cover p={p} big />
        <button className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/50 hover:bg-black/80" onClick={onClose} aria-label="Close"><X size={16} /></button>
        <div className="p-6">
          <h3 className="font-display text-3xl font-bold">{p.title}</h3>
          <p className="mt-1 text-sm text-accent">{p.tagline}</p>
          <p className="mt-4 text-sm leading-relaxed text-muted">{p.description}</p>
          {p.highlights.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {p.highlights.map((h) => (
                <div key={h.label} className="rounded-lg bg-white/[.04] p-3 text-center">
                  <div className="font-display text-lg font-bold text-accent">{h.value}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted">{h.label}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">{p.stack.map((s) => <SkillIcon key={s} icon={s} name={s} size={32} />)}</div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {p.tags.map((t) => <span key={t} className="chip text-primary">{t}</span>)}
            {gh && <span className="chip text-amber-400"><Star size={11} /> {gh.stargazers_count}</span>}
            {gh && <span className="chip text-muted">Updated {new Date(gh.pushed_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {p.repo && <a className="btn btn-primary" href={`https://github.com/${p.repo}`} target="_blank" rel="noreferrer"><Github size={14} /> Source</a>}
            {p.url && <a className="btn btn-ghost" href={p.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Visit</a>}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function Projects() {
  const c = useC()
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('All')
  const [open, setOpen] = useState<string | null>(null)
  const [repos, setRepos] = useState<GhRepo[]>([])
  useEffect(() => { void fetchRepos(c.site.githubUser).then((r) => setRepos(r ?? [])) }, [c.site.githubUser])

  const tags = useMemo(() => ['All', ...Array.from(new Set(c.projects.flatMap((p) => p.tags)))], [c.projects])
  const shown = c.projects.filter((p) => (tag === 'All' || p.tags.includes(tag)) && `${p.title} ${p.tagline} ${p.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
  const active = c.projects.find((p) => p.id === open)
  const ghFor = (p: Project) => repos.find((r) => r.full_name.toLowerCase() === p.repo.toLowerCase())

  return (
    <div className="relative">
      <HiddenBug id="b2" className="-top-6 right-2" />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="panel flex items-center gap-2 px-3 py-2 text-xs">
          <Search size={14} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search library…" aria-label="Search projects" className="w-40 bg-transparent outline-none placeholder:text-muted" />
        </label>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <button key={t} onClick={() => setTag(t)} className={cx('chip cursor-pointer transition-colors', tag === t ? 'text-accent' : 'text-muted hover:text-ink')}>{t}</button>
          ))}
        </div>
      </div>
      <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((p, i) => (
            <motion.div key={p.id} layout initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: (i % 3) * 0.07 }}>
              <Tilt max={6}>
                <motion.button layoutId={`proj-${p.id}`} onClick={() => setOpen(p.id)} className="panel panel-hover block w-full overflow-hidden text-left" aria-label={`Open ${p.title}`}>
                  <Cover p={p} />
                  <div className="p-4">
                    <h3 className="font-display text-lg font-bold">{p.title}</h3>
                    <p className="mt-1 line-clamp-2 min-h-[2.4rem] text-xs text-muted">{p.tagline}</p>
                    <div className="mt-3 flex flex-wrap gap-2">{p.stack.slice(0, 6).map((s) => <SkillIcon key={s} icon={s} name={s} size={20} />)}</div>
                  </div>
                </motion.button>
              </Tilt>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {shown.length === 0 && <p className="py-10 text-center text-sm text-muted">No games match. (¬_¬)</p>}
      <AnimatePresence>{active && <Modal key={active.id} p={active} gh={ghFor(active)} onClose={() => setOpen(null)} />}</AnimatePresence>
    </div>
  )
}

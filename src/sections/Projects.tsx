import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, Search, Star } from 'lucide-react'
import { useC } from '../store/content'
import { useProgress } from '../store/progress'
import { useFx } from '../store/fx'
import { Modal, HiddenBug } from '../components/kit'
import { TilePattern } from '../components/TileWall'
import { Tilt } from '../components/fx'
import { Icon, TechIcon } from '../lib/icons'
import { fetchRepos, type GhRepo } from '../lib/github'
import { cx, TONE_VAR } from '../lib/utils'
import { play } from '../lib/sound'
import type { Project } from '../types'

const STATUS: Record<Project['status'], { label: string; dot: string }> = {
  live: { label: 'Live', dot: '#2fbf71' },
  shipped: { label: 'Shipped', dot: '#3b82d6' },
  wip: { label: 'In development', dot: '#e8a020' },
  archived: { label: 'Archived', dot: '#8a96a3' },
}

function Cover({ p, height = 'h-36' }: { p: Project; height?: string }) {
  const s = STATUS[p.status]
  return (
    <div className={cx('relative overflow-hidden', height)}>
      <TilePattern tone={TONE_VAR[p.tone]} kind={p.id.length % 4} />
      <span className="absolute bottom-3 left-4 grid h-12 w-12 place-items-center rounded-xl border-[1.5px] border-ink bg-surface text-ink"><Icon name={p.icon} size={24} /></span>
      <span className="chip absolute right-3 top-3 bg-surface"><span className="h-2 w-2 rounded-full" style={{ background: s.dot }} aria-hidden />{s.label}</span>
    </div>
  )
}

export function Projects() {
  const c = useC()
  const unlock = useProgress((s) => s.unlock)
  const fx = useFx((s) => s.play)
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('All')
  const [open, setOpen] = useState<string | null>(null)
  const [repos, setRepos] = useState<GhRepo[]>([])
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const longPressed = useRef(false)
  useEffect(() => { void fetchRepos(c.site.githubUser).then((r) => setRepos(r ?? [])) }, [c.site.githubUser])

  const tags = useMemo(() => ['All', ...Array.from(new Set(c.projects.flatMap((p) => p.tags)))], [c.projects])
  const shown = c.projects.filter((p) => (tag === 'All' || p.tags.includes(tag)) && `${p.title} ${p.tagline} ${p.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
  const active = c.projects.find((p) => p.id === open)
  const ghFor = (p: Project) => repos.find((r) => r.full_name.toLowerCase() === p.repo.toLowerCase())

  // Press and hold the BanjirKawan card: the touch-friendly way to summon the flood.
  const startPress = (p: Project) => {
    longPressed.current = false
    if (p.id !== 'banjirkawan') return
    pressTimer.current = setTimeout(() => { longPressed.current = true; unlock('flood'); fx('flood', 5500); play('whoosh') }, 650)
  }
  const endPress = () => clearTimeout(pressTimer.current)

  return (
    <div className="relative">
      <HiddenBug id="b2" className="-top-14 right-0" />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="relative">
          <span className="sr-only">Search games</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input className="field !w-56 !pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the library" />
        </label>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Filter by tag">
          {tags.map((t) => (
            <button key={t} aria-pressed={tag === t} onClick={() => { setTag(t); play('tick') }} className={cx('chip !min-h-9 shrink-0 !px-3 !text-sm transition-colors', tag === t && 'chip-solid')}>{t}</button>
          ))}
        </div>
      </div>

      <motion.ul layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((p) => (
            <motion.li key={p.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }}>
              <Tilt max={5}>
              <button
                onClick={() => { if (longPressed.current) { longPressed.current = false; return } play('select'); setOpen(p.id) }}
                onPointerDown={() => startPress(p)} onPointerUp={endPress} onPointerLeave={endPress} onPointerCancel={endPress}
                onContextMenu={(e) => { if (p.id === 'banjirkawan') e.preventDefault() }}
                className="card lift block w-full select-none overflow-hidden text-left [-webkit-touch-callout:none]"
                aria-label={`Open ${p.title}`}
              >
                <Cover p={p} />
                <div className="p-4">
                  <h3 className="text-xl font-bold">{p.title}</h3>
                  <p className="mt-1 line-clamp-2 min-h-[2.9rem] text-[.95rem] text-muted">{p.tagline}</p>
                  <div className="mt-3 flex min-h-6 flex-wrap gap-2.5 text-muted">{p.stack.slice(0, 6).map((s) => <TechIcon key={s} name={s} size={20} />)}</div>
                </div>
              </button>
              </Tilt>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
      {shown.length === 0 && <p className="py-12 text-center text-muted">Nothing in the library matches "{q}". Clear the search or pick another tag.</p>}

      <Modal open={!!active} onOpenChange={(o) => !o && setOpen(null)} title={active?.title ?? ''} description={active?.tagline} wide>
        {active && (
          <div>
            <div className="-mx-6 -mt-2 mb-5 overflow-hidden md:rounded-xl"><Cover p={active} height="h-32" /></div>
            <p className="prose-tight leading-relaxed">{active.description}</p>
            {active.highlights.length > 0 && (
              <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {active.highlights.map((h) => (
                  <div key={h.label} className="card-raised p-3"><dd className="font-display text-xl font-extrabold">{h.value}</dd><dt className="text-xs text-muted">{h.label}</dt></div>
                ))}
              </dl>
            )}
            <div className="mt-5 flex flex-wrap gap-3 text-muted">{active.stack.map((s) => <TechIcon key={s} name={s} size={28} />)}</div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {active.tags.map((t) => <span key={t} className="chip">{t}</span>)}
              {ghFor(active) && <span className="chip"><Star size={12} aria-hidden /> {ghFor(active)!.stargazers_count}</span>}
              {ghFor(active) && <span className="chip">Updated {new Date(ghFor(active)!.pushed_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {active.repo && <a className="btn" href={`https://github.com/${active.repo}`} target="_blank" rel="noreferrer"><TechIcon name="github" size={18} /> Source code</a>}
              {active.url && <a className="btn btn-soft" href={active.url} target="_blank" rel="noreferrer">Visit <ArrowUpRight size={18} aria-hidden /></a>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

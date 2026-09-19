import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ChevronDown, ExternalLink, Mail, MapPin, Link as LinkIcon } from 'lucide-react'
import { Github, Linkedin } from '../components/BrandIcons'
import { useC } from '../store/content'
import { useProgress } from '../store/progress'
import { useFx } from '../store/fx'
import { ErrorBoundary, CountUp, Typewriter, HiddenBug } from '../components/ui'
import { fetchUser, type GhUser } from '../lib/github'
import { prefersReducedMotion, RARITY_COLOR } from '../lib/utils'
import { sfx } from '../lib/sound'

const HeroScene = lazy(() => import('../three/HeroScene'))
const ICONS: Record<string, typeof Github> = { github: Github, linkedin: Linkedin, mail: Mail as unknown as typeof Github }

const webgl = (() => {
  try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false }
})()

export function Hero() {
  const c = useC()
  const { profile: p, theme } = c
  const unlock = useProgress((s) => s.unlock)
  const play = useFx((s) => s.play)
  const [gh, setGh] = useState<GhUser | null>(null)
  const [imgOk, setImgOk] = useState(true)
  const clicks = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => { void fetchUser(c.site.githubUser).then(setGh) }, [c.site.githubUser])

  const featured = c.projects.find((x) => x.featured) ?? c.projects[0]
  const level = c.projects.length * 2 + c.achievements.length * 3 + c.openSource.length * 2
  const statusColor = p.status === 'online' ? '#22c55e' : p.status === 'away' ? '#f59e0b' : '#64748b'
  const topBadges = c.achievements.slice(0, 6)
  const wip = c.projects.find((x) => x.status === 'wip')

  const poke = () => {
    sfx.blip()
    clearTimeout(timer.current)
    clicks.current += 1
    if (clicks.current >= 7) { clicks.current = 0; unlock('avatar7'); play('flip', 2500) }
    else timer.current = setTimeout(() => { clicks.current = 0 }, 1500)
  }

  return (
    <header id="top" className="relative flex min-h-[100svh] items-center overflow-hidden pt-14">
      <div className="grid-bg absolute inset-0" />
      {theme.hero3d && webgl && (
        <div className="absolute inset-0 opacity-90">
          <ErrorBoundary>
            <Suspense fallback={null}>
              <HeroScene primary={theme.primary} secondary={theme.secondary} accent={theme.accent} still={prefersReducedMotion()} onChip={() => unlock('chip')} />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,var(--bg)_10%,transparent_60%),linear-gradient(180deg,transparent_60%,var(--bg))]" />

      <div className="pointer-events-none relative z-10 mx-auto grid w-full max-w-6xl items-start gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} className="panel panel-glass pointer-events-auto relative p-5 sm:p-7">
          <HiddenBug id="b1" className="right-4 top-3" />
          <div className="flex flex-col gap-5 sm:flex-row">
            <button onClick={poke} className="relative h-32 w-32 shrink-0 self-start rounded-2xl p-[3px]" style={{ background: 'conic-gradient(from 0deg, var(--accent), var(--primary), var(--secondary), var(--accent))', animation: 'pulse-ring 2.4s ease-out infinite' }} aria-label="Profile picture (try poking it)">
              {imgOk && p.avatar ? (
                <img src={p.avatar} alt={p.name} onError={() => setImgOk(false)} className="h-full w-full rounded-[13px] bg-surface object-cover" />
              ) : (
                <div className="font-display grid h-full w-full place-items-center rounded-[13px] bg-surface text-4xl font-bold text-grad">{p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>
              )}
              <span className="bg-grad absolute -bottom-3 -right-3 grid h-11 w-11 place-items-center rounded-xl border-2 border-bg leading-none" title="Player level">
                <span className="text-[8px] font-medium tracking-widest opacity-80">LV</span>
                <span className="-mt-3 text-sm font-extrabold">{level}</span>
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
                <span className="text-grad">{p.name}</span>
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span>@{p.handle}</span>
                <span className="inline-flex items-center gap-1"><MapPin size={12} />{p.location}</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-2 text-xs font-bold" style={{ color: statusColor }}>
                <span className="h-2 w-2 rounded-full" style={{ background: statusColor, boxShadow: `0 0 10px ${statusColor}` }} />
                {p.statusText}
              </div>
              <p className="mt-4 min-h-[1.5rem] text-sm text-accent sm:text-base"><Typewriter lines={p.typing} /></p>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{p.bio}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {p.links.map((l) => {
              const I = ICONS[l.icon] ?? LinkIcon
              return (
                <a key={l.label} href={l.url} target={l.url.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className={l.icon === 'github' ? 'btn btn-primary' : 'btn btn-ghost'}>
                  <I size={14} /> {l.label}
                </a>
              )
            })}
            <button className="btn btn-ghost" onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}>
              Library <ChevronDown size={14} />
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
            <span className="mr-1 text-[10px] uppercase tracking-widest text-muted">Badges</span>
            {topBadges.map((a) => (
              <span key={a.id} title={`${a.title} (${a.rarity})`} className="grid h-9 w-9 place-items-center rounded-lg text-lg" style={{ background: `${RARITY_COLOR[a.rarity]}22`, border: `1px solid ${RARITY_COLOR[a.rarity]}88` }}>
                {a.icon}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Sidebar */}
        <motion.aside initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }} className="pointer-events-auto flex flex-col gap-4">
          {wip && (
            <div className="panel panel-glass p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted">Currently playing</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center rounded-lg text-2xl" style={{ background: `linear-gradient(135deg, ${wip.colorA}, ${wip.colorB})` }}>{wip.emoji}</div>
                <div className="min-w-0">
                  <div className="truncate font-bold">{wip.title}</div>
                  <div className="text-xs text-muted">{wip.tagline}</div>
                </div>
              </div>
            </div>
          )}
          <div className="panel panel-glass grid grid-cols-2 gap-3 p-4 text-center">
            {[
              ['Projects', c.projects.length],
              ['Awards', c.achievements.length],
              ['Open source', c.openSource.length],
              ['GitHub repos', gh?.public_repos ?? '—'],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-lg bg-white/[.03] p-3">
                <CountUp to={v as number | string} className="font-display text-2xl font-bold text-accent" />
                <div className="text-[10px] uppercase tracking-widest text-muted">{l}</div>
              </div>
            ))}
          </div>
          <div className="panel panel-glass p-4">
            <div className="text-[10px] uppercase tracking-widest text-muted">Current mission</div>
            <ul className="mt-2 space-y-1.5 text-xs">
              {p.mission.map((m) => <li key={m} className="flex gap-2"><span className="text-secondary">▸</span>{m}</li>)}
            </ul>
          </div>
          {featured && (
            <a href={featured.repo ? `https://github.com/${featured.repo}` : '#projects'} target={featured.repo ? '_blank' : undefined} rel="noreferrer" className="btn btn-ghost justify-center">
              Featured: {featured.title} <ExternalLink size={13} />
            </a>
          )}
        </motion.aside>
      </div>

      <motion.div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-muted" animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
        <ChevronDown />
      </motion.div>
    </header>
  )
}

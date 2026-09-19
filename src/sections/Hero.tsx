import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowDown, MapPin, MessageCircle, UserPlus } from 'lucide-react'
import { useC } from '../store/content'
import { useProgress } from '../store/progress'
import { useAuth } from '../store/auth'
import { useUI } from '../store/ui'
import { useFx } from '../store/fx'
import { CountUp, ErrorBoundary, Typewriter, useMediaQuery } from '../components/kit'
import { TileWall } from '../components/TileWall'
import { Icon, LinkIcon, TechIcon } from '../lib/icons'
import { fetchUser, type GhUser } from '../lib/github'
import { levelProgress } from '../lib/level'
import { prefersReducedMotion, RARITY_COLOR, TONE_VAR } from '../lib/utils'
import { play } from '../lib/sound'
import { backendOn } from '../lib/supabase'

const Board = lazy(() => import('../three/Board'))

const webgl = (() => {
  try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false }
})()

const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#0a7c74'

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-4 ${className ?? ''}`} aria-label={title}>
      <h3 className="label mb-3 !font-body text-[.82rem] font-semibold tracking-normal">{title}</h3>
      {children}
    </section>
  )
}

export function Hero() {
  const c = useC()
  const { profile: p, theme } = c
  const unlock = useProgress((s) => s.unlock)
  const xp = useProgress((s) => s.xp)
  const eggs = useProgress((s) => s.eggs)
  const themeKey = useProgress((s) => s.theme)
  const modeKey = useProgress((s) => s.mode)
  const session = useAuth((s) => s.session)
  const friends = useAuth((s) => s.friends)
  const setAuth = useUI((s) => s.setAuth)
  const fx = useFx((s) => s.play)
  const desktop = useMediaQuery('(min-width: 768px)')
  const [gh, setGh] = useState<GhUser | null>(null)
  const [imgOk, setImgOk] = useState(true)
  const [colors, setColors] = useState({ pcb: '#0a7c74', accent: '#e8465c' })
  const clicks = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => { void fetchUser(c.site.githubUser).then(setGh) }, [c.site.githubUser])
  useEffect(() => { setColors({ pcb: cssVar('--primary'), accent: cssVar('--accent') }) }, [themeKey, modeKey, theme.defaultTheme, theme.defaultMode])

  const wip = c.projects.find((x) => x.status === 'wip')
  const level = c.projects.length * 2 + c.achievements.length * 3 + c.openSource.length * 2
  const me = levelProgress(xp)
  const statusColor = p.status === 'online' ? '#2fbf71' : p.status === 'away' ? '#e8a020' : '#8a96a3'
  const badges = c.achievements.slice(0, 6)
  const unlocked = Object.keys(eggs).length

  const poke = () => {
    play('click', { rate: 1 + clicks.current * 0.06 })
    clearTimeout(timer.current)
    clicks.current += 1
    if (clicks.current >= 7) { clicks.current = 0; unlock('avatar7'); fx('flip', 2500); play('bong') }
    else timer.current = setTimeout(() => { clicks.current = 0 }, 1500)
  }

  return (
    <header id="top" className="snap-page relative">
      <TileWall rows={desktop ? 4 : 3} />

      <div className="relative z-10 mx-auto -mt-16 grid w-full max-w-6xl gap-5 px-4 pb-16 sm:px-6 lg:-mt-20 lg:grid-cols-[1fr_21rem]">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }} className="card self-start p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row">
            <button
              onClick={poke}
              aria-label="Profile picture. Tap it a few times."
              className="relative -mt-14 h-32 w-32 shrink-0 self-start rounded-[22px] border-[3px] border-ink bg-surface p-1 shadow-[0_5px_0_var(--accent)] transition-transform active:translate-y-1 active:shadow-[0_1px_0_var(--accent)] sm:-mt-16 sm:h-36 sm:w-36"
            >
              {imgOk && p.avatar ? (
                <img src={p.avatar} alt={p.name} onError={() => setImgOk(false)} className="h-full w-full rounded-[16px] object-cover" />
              ) : (
                <span className="font-display grid h-full w-full place-items-center rounded-[16px] bg-raised text-4xl font-bold">{p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
              )}
              <span className="absolute -bottom-3 -right-3 grid h-11 w-11 place-items-center rounded-full border-[3px] border-ink bg-sun font-display text-base font-extrabold text-[#1b1b1b]" title="Profile level">{level}</span>
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[2.6rem] font-extrabold leading-[.95] sm:text-[3.6rem]">{p.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <span>@{p.handle}</span>
                <span className="inline-flex items-center gap-1"><MapPin size={14} aria-hidden />{p.location}</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-ink"><span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColor }} aria-hidden />{p.statusText}</span>
              </div>
              <p className="font-display mt-4 min-h-[1.75rem] text-lg font-semibold text-primary sm:text-xl"><Typewriter lines={[p.tagline, ...p.typing.filter((t) => t !== p.tagline)]} /></p>
              <p className="prose-tight mt-2 text-[1.02rem] leading-relaxed text-muted">{p.bio}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!session && backendOn && <button className="btn" onClick={() => setAuth(true)}><UserPlus size={18} aria-hidden /> Add friend</button>}
            <button className="btn btn-soft" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}><MessageCircle size={18} aria-hidden /> Send a message</button>
            {p.links.map((l) => (
              <a key={l.label} className="btn btn-soft" href={l.url} target="_blank" rel="noreferrer"><LinkIcon name={l.icon} size={18} /> {l.label}</a>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t-[1.5px] border-line pt-5">
            <span className="label mr-1">Showcase badges</span>
            {badges.map((a) => (
              <span key={a.id} title={`${a.title} (${a.rarity})`} className="grid h-10 w-10 place-items-center rounded-[10px] border-[1.5px] bg-raised" style={{ borderColor: RARITY_COLOR[a.rarity] }}>
                <Icon name={a.icon} size={20} />
              </span>
            ))}
          </div>
        </motion.div>

        <motion.aside initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }} className="flex flex-col gap-4">
          {wip && (
            <Card title="Currently building">
              <div className="flex items-center gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-white" style={{ background: TONE_VAR[wip.tone] }}><Icon name={wip.icon} size={26} /></span>
                <div className="min-w-0">
                  <div className="truncate font-display text-lg font-bold">{wip.title}</div>
                  <div className="text-sm text-muted">{wip.tagline}</div>
                </div>
              </div>
            </Card>
          )}

          <Card title="Your progress">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-primary font-display text-lg font-extrabold text-on-primary">{me.level}</span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between text-sm font-semibold"><span>Explorer level {me.level}</span><span className="text-muted">{xp} XP</span></div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full border-[1.5px] border-line bg-raised" role="progressbar" aria-valuenow={Math.round(me.pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next level">
                  <motion.div className="h-full bg-accent" initial={{ width: 0 }} animate={{ width: `${Math.max(4, me.pct * 100)}%` }} transition={{ duration: 0.8 }} />
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted">{unlocked} of {c.eggs.length} hidden achievements found.{!session && backendOn ? ' Sign in to keep your progress.' : ''}</p>
          </Card>

          {backendOn && (
            <Card title="Friends">
              <div className="flex items-end justify-between">
                <div><CountUp to={friends ?? 0} className="font-display text-3xl font-extrabold" /> <span className="text-sm text-muted">{friends === 1 ? 'friend' : 'friends'}</span></div>
                {!session && <button className="btn btn-sm" onClick={() => setAuth(true)}>Add friend</button>}
              </div>
            </Card>
          )}

          <Card title="Hardware bench">
            <div className="h-44 overflow-hidden rounded-xl border-[1.5px] border-line bg-raised" style={{ touchAction: 'pan-y' }}>
              {theme.hero3d && webgl ? (
                <ErrorBoundary fallback={<div className="grid h-full place-items-center text-sm text-muted">3D preview unavailable</div>}>
                  <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted">Loading board...</div>}>
                    <Board pcb={colors.pcb} accent={colors.accent} still={prefersReducedMotion()} onBoot={() => { unlock('chip'); play('pluck') }} />
                  </Suspense>
                </ErrorBoundary>
              ) : <div className="grid h-full place-items-center text-muted"><TechIcon name="cpu" size={40} /></div>}
            </div>
            <p className="mt-2 text-sm text-muted">An ESP32 board. Drag to turn it. Press BOOT.</p>
          </Card>

          <Card title="Stats">
            <dl className="grid grid-cols-2 gap-3 text-center">
              {([['Games', c.projects.length], ['Awards', c.achievements.length], ['Open source', c.openSource.length], ['Repos', gh?.public_repos ?? '-']] as const).map(([l, v]) => (
                <div key={l} className="card-raised p-3">
                  <dt className="text-xs font-semibold text-muted">{l}</dt>
                  <dd className="font-display text-2xl font-extrabold"><CountUp to={v} /></dd>
                </div>
              ))}
            </dl>
          </Card>
        </motion.aside>
      </div>

      <a href="#showcase" aria-label="Scroll to the first section" onClick={(e) => { e.preventDefault(); document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth' }) }} className="btn btn-ghost btn-icon absolute bottom-3 left-1/2 hidden -translate-x-1/2 md:inline-flex">
        <ArrowDown size={20} />
      </a>
    </header>
  )
}

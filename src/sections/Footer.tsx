import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useC } from '../store/content'
import { useFx } from '../store/fx'
import { useProgress } from '../store/progress'
import { HiddenBug } from '../components/ui'

export function Footer() {
  const c = useC()
  const play = useFx((s) => s.play)
  const unlock = useProgress((s) => s.unlock)
  return (
    <footer className="relative mt-10 overflow-hidden border-t border-white/10 px-4 py-16 text-center">
      <HiddenBug id="b6" className="left-8 top-6" />
      <HiddenBug id="b7" className="bottom-4 right-1/4" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(0deg,var(--secondary),transparent)] opacity-20" />
      <div className="relative">
        <p className="font-display text-2xl font-bold sm:text-4xl"><span className="text-grad">BUILD • VERIFY • SHIP • REPEAT</span></p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {c.profile.links.map((l) => (
            <a key={l.label} href={l.url} target={l.url.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="btn btn-ghost">{l.label}</a>
          ))}
        </div>
        <div className="mt-8 text-xs text-muted">
          Made with React, three.js and an unreasonable number of 🐛 ·{' '}
          <button className="glitch text-accent" onClick={() => { play('flip', 2500); unlock('avatar7') }}>(╯°□°）╯︵ ┻━┻</button>
        </div>
        <div className="mt-3 text-[10px] text-muted/60">
          © {new Date().getFullYear()} {c.profile.name} ·{' '}
          <Link to="/admin" className="inline-flex items-center gap-1 hover:text-accent" aria-label="CMS backstage"><Lock size={10} /> backstage</Link>
        </div>
      </div>
    </footer>
  )
}

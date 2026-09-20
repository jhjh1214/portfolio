import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useC } from '../store/content'
import { useFx, burst } from '../store/fx'
import { useProgress } from '../store/progress'
import { HiddenBug } from '../components/kit'
import { play } from '../lib/sound'

const MOTTO = ['Build', 'Verify', 'Ship', 'Repeat']

export function Footer() {
  const c = useC()
  const fx = useFx((s) => s.play)
  const unlock = useProgress((s) => s.unlock)
  const step = useRef(0)

  // Touch route to the "Ship it" egg: tap the motto words in order.
  const tapWord = (i: number) => {
    play('click', { rate: 0.9 + i * 0.12 })
    if (i === step.current) step.current += 1
    else step.current = i === 0 ? 1 : 0
    if (step.current === MOTTO.length) { step.current = 0; unlock('shipit'); burst(); play('win') }
  }

  return (
    <footer className="relative mt-4 flex flex-col justify-end overflow-hidden border-t-[1.5px] border-line bg-ink pb-28 pt-16 text-bg md:pb-12">
      <HiddenBug id="b6" className="left-6 top-4" />
      <HiddenBug id="b7" className="bottom-28 right-1/4" />
      <div className="wrap">
        <p className="font-display flex flex-wrap gap-x-4 text-[2.6rem] font-extrabold leading-none sm:text-7xl">
          {MOTTO.map((w, i) => (
            <button key={w} onClick={() => tapWord(i)} className="rounded-lg px-1 transition-transform hover:-translate-y-1 active:translate-y-0.5">{w}.</button>
          ))}
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <span className="opacity-80">{c.profile.name}, {c.profile.location}</span>
          <button className="glitch underline decoration-dotted underline-offset-4" onClick={() => { fx('flip', 2500); unlock('avatar7') }}>(╯°□°）╯︵ ┻━┻</button>
          <span className="ml-auto flex flex-wrap gap-x-5">
            <Link className="underline-offset-4 hover:underline" to="/colophon">Credits</Link>
            <Link className="underline-offset-4 hover:underline" to="/terms">Terms</Link>
            <Link className="underline-offset-4 hover:underline" to="/admin">Staff only</Link>
          </span>
        </div>
        <p className="mt-4 text-xs opacity-60">&copy; {new Date().getFullYear()} {c.profile.name}. Built with React and three.js.</p>
      </div>
    </footer>
  )
}

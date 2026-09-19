import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useReport } from './report'
import { sfx } from '../lib/sound'

type Cell = null | 'bug' | 'gift'
const ROUND = 30

export function BugSquash() {
  const { best, started, finish } = useReport('bugsquash')
  const [phase, setPhase] = useState<'idle' | 'run' | 'done'>('idle')
  const [cells, setCells] = useState<Cell[]>(Array(9).fill(null))
  const [score, setScore] = useState(0)
  const [time, setTime] = useState(ROUND)
  const [newBest, setNewBest] = useState(false)
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (phase !== 'run') return
    const clock = setInterval(() => setTime((t) => t - 1), 1000)
    let elapsed = 0
    let spawn: ReturnType<typeof setTimeout>
    const loop = () => {
      const i = Math.floor(Math.random() * 9)
      const kind: Cell = Math.random() < 0.2 ? 'gift' : 'bug'
      setCells((c) => Object.assign([...c], { [i]: kind }))
      const life = Math.max(450, 900 - elapsed * 14)
      timeouts.current.push(setTimeout(() => setCells((c) => (c[i] === kind ? Object.assign([...c], { [i]: null }) : c)), life))
      elapsed += 0.6
      spawn = setTimeout(loop, Math.max(280, 650 - elapsed * 12))
    }
    loop()
    return () => { clearInterval(clock); clearTimeout(spawn); timeouts.current.forEach(clearTimeout); timeouts.current = [] }
  }, [phase])

  useEffect(() => {
    if (phase === 'run' && time <= 0) {
      setPhase('done')
      setCells(Array(9).fill(null))
      setNewBest(finish(score))
      sfx.win()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, phase])

  const start = () => { started(); setScore(0); setTime(ROUND); setNewBest(false); setPhase('run') }
  const whack = (i: number) => {
    const k = cells[i]
    if (!k || phase !== 'run') return
    setCells((c) => Object.assign([...c], { [i]: null }))
    if (k === 'bug') { sfx.hit(); setScore((s) => s + 1) } else { sfx.bad(); setScore((s) => Math.max(0, s - 3)) }
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mb-4 flex justify-between text-sm">
        <span>Squashed <b className="text-accent">{score}</b></span>
        <span>Time <b className={time <= 5 && phase === 'run' ? 'text-secondary' : 'text-accent'}>{time}s</b></span>
        <span>Best <b className="text-accent">{best ?? '—'}</b></span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {cells.map((c, i) => (
          <button key={i} onPointerDown={() => whack(i)} aria-label={c ? (c === 'bug' ? 'Bug! squash it' : 'Feature gift, avoid') : 'Empty hole'} className="panel relative aspect-square overflow-hidden text-4xl" style={{ background: 'radial-gradient(ellipse at 50% 85%, #000 30%, var(--surface) 70%)' }}>
            <AnimatePresence>
              {c && <motion.span key={c} className="absolute inset-0 grid place-items-center" initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60, scale: 0.4 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>{c === 'bug' ? '🐛' : '🎁'}</motion.span>}
            </AnimatePresence>
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">Squash 🐛 bugs. Don't touch 🎁 "features" (−3).</p>
      {phase !== 'run' && (
        <button className="btn btn-primary mt-4" onClick={start}>
          {phase === 'done' ? `Score ${score}${newBest ? ' — new best! ' : ''} · Again` : 'Start'}
        </button>
      )}
    </div>
  )
}

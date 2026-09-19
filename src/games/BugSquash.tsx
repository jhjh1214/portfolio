import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bug, Gift } from 'lucide-react'
import { useReport } from './report'
import { play } from '../lib/sound'

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
  const scoreRef = useRef(0)

  useEffect(() => {
    if (phase !== 'run') return
    const clock = setInterval(() => setTime((t) => t - 1), 1000)
    let elapsed = 0
    let spawn: ReturnType<typeof setTimeout>
    const loop = () => {
      const i = Math.floor(Math.random() * 9)
      const kind: Cell = Math.random() < 0.2 ? 'gift' : 'bug'
      setCells((c) => Object.assign([...c], { [i]: kind }))
      const life = Math.max(480, 950 - elapsed * 14)
      timeouts.current.push(setTimeout(() => setCells((c) => (c[i] === kind ? Object.assign([...c], { [i]: null }) : c)), life))
      elapsed += 0.6
      spawn = setTimeout(loop, Math.max(300, 680 - elapsed * 12))
    }
    loop()
    return () => { clearInterval(clock); clearTimeout(spawn); timeouts.current.forEach(clearTimeout); timeouts.current = [] }
  }, [phase])

  useEffect(() => {
    if (phase === 'run' && time <= 0) {
      setPhase('done')
      setCells(Array(9).fill(null))
      setNewBest(finish(scoreRef.current))
      play('win')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, phase])

  const start = () => { started(); scoreRef.current = 0; setScore(0); setTime(ROUND); setNewBest(false); setPhase('run') }
  const whack = (i: number) => {
    const k = cells[i]
    if (!k || phase !== 'run') return
    setCells((c) => Object.assign([...c], { [i]: null }))
    if (k === 'bug') { play('hit', { rate: 1 + Math.min(scoreRef.current, 20) * 0.02 }); scoreRef.current += 1 } else { play('error'); scoreRef.current = Math.max(0, scoreRef.current - 3) }
    setScore(scoreRef.current)
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mb-4 flex justify-between text-sm font-semibold">
        <span>Squashed <b className="font-display text-xl">{score}</b></span>
        <span aria-live="off">Time <b className={`font-display text-xl ${time <= 5 && phase === 'run' ? 'text-accent' : ''}`}>{time}s</b></span>
        <span>Best <b className="font-display text-xl">{best ?? '-'}</b></span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {cells.map((c, i) => (
          <button key={i} onPointerDown={() => whack(i)} aria-label={c === 'bug' ? 'Bug. Squash it.' : c === 'gift' ? 'A feature gift. Avoid it.' : 'Empty hole'} className="relative aspect-square overflow-hidden rounded-2xl border-[1.5px] border-ink bg-raised shadow-[inset_0_-14px_0_color-mix(in_srgb,var(--ink)_14%,transparent)] touch-manipulation">
            <AnimatePresence>
              {c && (
                <motion.span key={c} className={`absolute inset-0 grid place-items-center ${c === 'bug' ? 'text-accent' : 'text-primary'}`} initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60, scale: 0.5 }} transition={{ type: 'spring', stiffness: 520, damping: 22 }}>
                  {c === 'bug' ? <Bug size={44} strokeWidth={2} /> : <Gift size={44} strokeWidth={2} />}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">Tap the bugs. Leave the gift boxes alone: those are "features" and cost 3 points.</p>
      {phase !== 'run' && <button className="btn mt-4" onClick={start}>{phase === 'done' ? `You squashed ${score}${newBest ? ', a new best' : ''}. Play again` : 'Start'}</button>}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useReport } from './report'
import { sfx } from '../lib/sound'

const FACES = ['🐍', '☕', '⚛️', '🅰️', '🐳', '⛓️', '📡', '🤖']
interface Card { id: number; face: string; open: boolean; done: boolean }
const deal = (): Card[] =>
  [...FACES, ...FACES].map((face, id) => ({ id, face, open: false, done: false })).sort(() => Math.random() - 0.5)

export function Memory() {
  const { best, started, finish } = useReport('memory')
  const [cards, setCards] = useState<Card[]>(deal)
  const [moves, setMoves] = useState(0)
  const [lock, setLock] = useState(false)
  const [won, setWon] = useState(false)

  const flip = (id: number) => {
    const c = cards.find((x) => x.id === id)!
    if (lock || c.open || c.done) return
    started(); sfx.blip()
    const next = cards.map((x) => (x.id === id ? { ...x, open: true } : x))
    const open = next.filter((x) => x.open && !x.done)
    setCards(next)
    if (open.length === 2) {
      setMoves((m) => m + 1)
      setLock(true)
      const match = open[0].face === open[1].face
      setTimeout(() => {
        setCards((cur) => cur.map((x) => (x.open && !x.done ? (match ? { ...x, done: true } : { ...x, open: false }) : x)))
        setLock(false)
        if (match) sfx.hit()
      }, match ? 350 : 800)
    }
  }

  useEffect(() => {
    if (!won && cards.every((c) => c.done)) { setWon(true); finish(moves, true); sfx.win() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards])

  const reset = () => { setCards(deal()); setMoves(0); setWon(false); setLock(false) }

  return (
    <div className="mx-auto max-w-sm text-center">
      <div className="mb-4 flex justify-between text-sm"><span>Moves <b className="text-accent">{moves}</b></span><span>Best <b className="text-accent">{best ?? '—'}</b></span></div>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((c) => (
          <button key={c.id} onClick={() => flip(c.id)} aria-label={c.open || c.done ? c.face : 'Hidden card'} className="aspect-square [perspective:600px]">
            <motion.div className="relative h-full w-full [transform-style:preserve-3d]" animate={{ rotateY: c.open || c.done ? 180 : 0 }} transition={{ duration: 0.35 }}>
              <div className="panel absolute inset-0 grid place-items-center text-xl text-primary [backface-visibility:hidden]">?</div>
              <div className="panel absolute inset-0 grid place-items-center text-3xl [backface-visibility:hidden] [transform:rotateY(180deg)]" style={c.done ? { borderColor: 'var(--accent)' } : undefined}>{c.face}</div>
            </motion.div>
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">{won ? `Cleared in ${moves} moves!` : 'Match the tech pairs. Fewer moves is better.'}</p>
      <button className="btn btn-ghost mt-3" onClick={reset}>{won ? 'Play again' : 'Shuffle'}</button>
    </div>
  )
}

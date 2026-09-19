import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useReport } from './report'
import { useProgress } from '../store/progress'
import { bestMove, winLine, winner, type Board } from '../lib/tictactoe'
import { sfx } from '../lib/sound'

const fresh = (): Board => Array(9).fill(null)

export function TicTacToe() {
  const { started, finish } = useReport('tictactoe')
  const unlock = useProgress((s) => s.unlock)
  const [b, setB] = useState<Board>(fresh)
  const [tally, setTally] = useState({ draw: 0, loss: 0 })
  const w = winner(b)
  const line = winLine(b)

  useEffect(() => {
    if (w) return
    const xs = b.filter((c) => c === 'X').length
    const os = b.filter((c) => c === 'O').length
    if (xs > os) {
      const t = setTimeout(() => setB((cur) => { const n = [...cur]; n[bestMove(cur)] = 'O'; return n }), 420)
      return () => clearTimeout(t)
    }
  }, [b, w])

  useEffect(() => {
    if (!w) return
    if (w === 'draw') { setTally((t) => ({ ...t, draw: t.draw + 1 })); unlock('stalemate'); sfx.win() } else { setTally((t) => ({ ...t, loss: t.loss + 1 })); sfx.bad() }
    finish(w === 'draw' ? 1 : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w])

  const move = (i: number) => {
    if (b[i] || w || b.filter(Boolean).length % 2 === 1) return
    started(); sfx.blip()
    setB((cur) => Object.assign([...cur], { [i]: 'X' }))
  }

  return (
    <div className="mx-auto max-w-xs text-center">
      <div className="mb-4 flex justify-between text-sm"><span>Draws <b className="text-accent">{tally.draw}</b></span><span>Wins <b className="text-accent">0</b> <span className="text-[10px] text-muted">(minimax says no)</span></span></div>
      <div className="grid grid-cols-3 gap-2">
        {b.map((c, i) => (
          <button key={i} onClick={() => move(i)} aria-label={`Cell ${i + 1}: ${c ?? 'empty'}`} className="panel aspect-square text-5xl font-bold" style={line?.includes(i) ? { borderColor: 'var(--secondary)', boxShadow: '0 0 24px var(--secondary)' } : undefined}>
            {c && <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} className={c === 'X' ? 'text-accent' : 'text-secondary'}>{c}</motion.span>}
          </button>
        ))}
      </div>
      <p className="mt-4 min-h-[1.25rem] text-xs text-muted">
        {!w ? 'You are X. Your move.' : w === 'draw' ? "A draw. That's the best anyone gets." : 'The machine wins. Again.'}
      </p>
      {w && <button className="btn btn-primary mt-3" onClick={() => setB(fresh())}>Rematch</button>}
    </div>
  )
}

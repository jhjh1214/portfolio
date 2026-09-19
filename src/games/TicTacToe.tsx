import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Circle, X } from 'lucide-react'
import { useReport } from './report'
import { useProgress } from '../store/progress'
import { bestMove, winLine, winner, type Board } from '../lib/tictactoe'
import { play } from '../lib/sound'

const fresh = (): Board => Array(9).fill(null)

export function TicTacToe() {
  const { started, finish } = useReport('tictactoe')
  const unlock = useProgress((s) => s.unlock)
  const [b, setB] = useState<Board>(fresh)
  const [draws, setDraws] = useState(0)
  const w = winner(b)
  const line = winLine(b)

  useEffect(() => {
    if (w) return
    const xs = b.filter((c) => c === 'X').length
    const os = b.filter((c) => c === 'O').length
    if (xs > os) {
      const t = setTimeout(() => { play('tick'); setB((cur) => { const n = [...cur]; n[bestMove(cur)] = 'O'; return n }) }, 420)
      return () => clearTimeout(t)
    }
  }, [b, w])

  useEffect(() => {
    if (!w) return
    if (w === 'draw') { setDraws((d) => d + 1); unlock('stalemate'); play('win') } else play('error')
    finish(w === 'draw' ? 1 : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w])

  const move = (i: number) => {
    if (b[i] || w || b.filter(Boolean).length % 2 === 1) return
    started(); play('click')
    setB((cur) => Object.assign([...cur], { [i]: 'X' }))
  }

  return (
    <div className="mx-auto max-w-xs text-center">
      <div className="mb-4 flex justify-between text-sm font-semibold"><span>Draws <b className="font-display text-xl">{draws}</b></span><span>Wins <b className="font-display text-xl">0</b> <span className="font-normal text-muted">(the AI plays perfectly)</span></span></div>
      <div className="grid grid-cols-3 gap-2.5">
        {b.map((c, i) => (
          <button key={i} onClick={() => move(i)} aria-label={`Cell ${i + 1}: ${c ?? 'empty'}`} className="grid aspect-square place-items-center rounded-2xl border-[1.5px] border-ink bg-raised touch-manipulation" style={line?.includes(i) ? { background: 'var(--sun)', color: '#1b1b1b' } : undefined}>
            {c && <motion.span initial={{ scale: 0, rotate: -60 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }} className={c === 'X' ? 'text-primary' : 'text-accent'}>{c === 'X' ? <X size={46} strokeWidth={3} /> : <Circle size={38} strokeWidth={3.4} />}</motion.span>}
          </button>
        ))}
      </div>
      <p className="mt-4 min-h-[1.5rem] text-sm text-muted" aria-live="polite">{!w ? 'You are X. Your move.' : w === 'draw' ? "A draw. That's the best anyone gets." : 'The machine wins. Again?'}</p>
      {w && <button className="btn mt-3" onClick={() => setB(fresh())}>Rematch</button>}
    </div>
  )
}

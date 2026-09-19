import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react'
import { useReport } from './report'
import { play } from '../lib/sound'

const N = 18
const CELL = 20
type P = { x: number; y: number }
const DIRS: Record<string, P> = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 } }

export function Snake() {
  const { best, started, finish } = useReport('snake')
  const cv = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<'idle' | 'run' | 'dead'>('idle')
  const [score, setScore] = useState(0)
  const st = useRef({ snake: [{ x: 9, y: 9 }] as P[], dir: { x: 1, y: 0 }, next: { x: 1, y: 0 }, food: { x: 3, y: 3 } as P, score: 0 })
  const touch = useRef<{ x: number; y: number } | null>(null)

  const draw = useCallback(() => {
    const ctx = cv.current?.getContext('2d')
    if (!ctx) return
    const css = getComputedStyle(document.documentElement)
    const v = (n: string) => css.getPropertyValue(n).trim()
    ctx.fillStyle = v('--raised')
    ctx.fillRect(0, 0, N * CELL, N * CELL)
    ctx.fillStyle = v('--line')
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
    const { snake, food } = st.current
    // the bug: body, head and legs
    const fx = food.x * CELL + CELL / 2
    const fy = food.y * CELL + CELL / 2
    ctx.strokeStyle = v('--accent'); ctx.lineWidth = 1.5
    for (const d of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(fx - 7, fy + d * 4); ctx.lineTo(fx + 7, fy + d * 4); ctx.stroke() }
    ctx.fillStyle = v('--accent'); ctx.beginPath(); ctx.ellipse(fx, fy + 1, 5.5, 7, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(fx, fy - 6, 3, 0, Math.PI * 2); ctx.fill()
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? v('--ink') : v('--primary')
      ctx.beginPath(); ctx.roundRect(s.x * CELL + 1.5, s.y * CELL + 1.5, CELL - 3, CELL - 3, 5); ctx.fill()
    })
  }, [])

  const steer = useCallback((d: P) => {
    const s = st.current
    if (d.x === -s.dir.x && d.y === -s.dir.y) return
    s.next = d
  }, [])

  const start = () => {
    started()
    st.current = { snake: [{ x: 9, y: 9 }], dir: { x: 1, y: 0 }, next: { x: 1, y: 0 }, food: { x: 3, y: 3 }, score: 0 }
    setScore(0)
    setPhase('run')
  }

  useEffect(() => { draw() }, [draw, phase])

  useEffect(() => {
    if (phase !== 'run') return
    const onKey = (e: KeyboardEvent) => {
      const d = DIRS[e.key.length === 1 ? e.key.toLowerCase() : e.key]
      if (!d) return
      e.preventDefault()
      steer(d)
    }
    addEventListener('keydown', onKey)
    const id = setInterval(() => {
      const s = st.current
      s.dir = s.next
      const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y }
      const hit = head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || s.snake.some((p) => p.x === head.x && p.y === head.y)
      if (hit) { setPhase('dead'); finish(s.score); play('error'); return }
      s.snake.unshift(head)
      if (head.x === s.food.x && head.y === s.food.y) {
        play('hit', { rate: 1 + Math.min(s.score, 15) * 0.03 })
        s.score += 1
        setScore(s.score)
        do { s.food = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) } } while (s.snake.some((p) => p.x === s.food.x && p.y === s.food.y))
      } else s.snake.pop()
      draw()
    }, 115)
    return () => { removeEventListener('keydown', onKey); clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  return (
    <div className="mx-auto max-w-sm text-center">
      <div className="mb-3 flex justify-between text-sm font-semibold"><span>Eaten <b className="font-display text-xl">{score}</b></span><span>Best <b className="font-display text-xl">{best ?? '-'}</b></span></div>
      <canvas
        ref={cv} width={N * CELL} height={N * CELL} aria-label="Snake game board"
        className="mx-auto block w-full max-w-[360px] touch-none rounded-2xl border-[1.5px] border-ink"
        onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
        onTouchEnd={(e) => {
          const t = touch.current; if (!t) return
          const dx = e.changedTouches[0].clientX - t.x; const dy = e.changedTouches[0].clientY - t.y
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
          steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS.ArrowRight : DIRS.ArrowLeft) : (dy > 0 ? DIRS.ArrowDown : DIRS.ArrowUp))
        }}
      />
      <div className="mx-auto mt-4 grid w-40 grid-cols-3 gap-1.5 md:hidden">
        <span /><button className="btn btn-soft btn-sm justify-center" onClick={() => steer(DIRS.ArrowUp)} aria-label="Up"><ArrowUp size={18} /></button><span />
        <button className="btn btn-soft btn-sm justify-center" onClick={() => steer(DIRS.ArrowLeft)} aria-label="Left"><ArrowLeft size={18} /></button>
        <button className="btn btn-soft btn-sm justify-center" onClick={() => steer(DIRS.ArrowDown)} aria-label="Down"><ArrowDown size={18} /></button>
        <button className="btn btn-soft btn-sm justify-center" onClick={() => steer(DIRS.ArrowRight)} aria-label="Right"><ArrowRight size={18} /></button>
      </div>
      <p className="mt-3 text-sm text-muted">Arrow keys or WASD. On a phone, swipe on the board or use the pad.</p>
      {phase !== 'run' && <button className="btn mt-3" onClick={start}>{phase === 'dead' ? `Crashed at ${score}. Try again` : 'Start'}</button>}
    </div>
  )
}

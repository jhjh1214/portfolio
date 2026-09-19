import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react'
import { useReport } from './report'
import { sfx } from '../lib/sound'

const N = 18
const CELL = 18
type P = { x: number; y: number }
const DIRS: Record<string, P> = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 } }

export function Snake() {
  const { best, started, finish } = useReport('snake')
  const cv = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<'idle' | 'run' | 'dead'>('idle')
  const [score, setScore] = useState(0)
  const st = useRef({ snake: [{ x: 9, y: 9 }] as P[], dir: { x: 1, y: 0 }, next: { x: 1, y: 0 }, food: { x: 3, y: 3 } as P, score: 0 })

  const draw = useCallback(() => {
    const ctx = cv.current?.getContext('2d')
    if (!ctx) return
    const css = getComputedStyle(document.documentElement)
    ctx.fillStyle = css.getPropertyValue('--surface') || '#0b1026'
    ctx.fillRect(0, 0, N * CELL, N * CELL)
    ctx.strokeStyle = 'rgba(255,255,255,.04)'
    for (let i = 0; i <= N; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, N * CELL); ctx.moveTo(0, i * CELL); ctx.lineTo(N * CELL, i * CELL); ctx.stroke() }
    const { snake, food } = st.current
    ctx.font = `${CELL - 2}px serif`
    ctx.textBaseline = 'top'
    ctx.fillText('🐛', food.x * CELL, food.y * CELL + 1)
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? css.getPropertyValue('--accent') : css.getPropertyValue('--primary')
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2)
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
      if (hit) {
        setPhase('dead')
        finish(s.score)
        sfx.bad()
        return
      }
      s.snake.unshift(head)
      if (head.x === s.food.x && head.y === s.food.y) {
        sfx.hit()
        s.score += 1
        setScore(s.score)
        do { s.food = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) } } while (s.snake.some((p) => p.x === s.food.x && p.y === s.food.y))
      } else s.snake.pop()
      draw()
    }, 110)
    return () => { removeEventListener('keydown', onKey); clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  return (
    <div className="mx-auto max-w-sm text-center">
      <div className="mb-3 flex justify-between text-sm"><span>Eaten <b className="text-accent">{score}</b></span><span>Best <b className="text-accent">{best ?? '—'}</b></span></div>
      <canvas ref={cv} width={N * CELL} height={N * CELL} className="panel mx-auto block max-w-full" style={{ imageRendering: 'pixelated' }} aria-label="Snake game board" />
      <div className="mx-auto mt-3 grid w-36 grid-cols-3 gap-1 sm:hidden">
        <span /><button className="btn btn-ghost justify-center px-0" onClick={() => steer(DIRS.ArrowUp)} aria-label="Up"><ArrowUp size={16} /></button><span />
        <button className="btn btn-ghost justify-center px-0" onClick={() => steer(DIRS.ArrowLeft)} aria-label="Left"><ArrowLeft size={16} /></button>
        <button className="btn btn-ghost justify-center px-0" onClick={() => steer(DIRS.ArrowDown)} aria-label="Down"><ArrowDown size={16} /></button>
        <button className="btn btn-ghost justify-center px-0" onClick={() => steer(DIRS.ArrowRight)} aria-label="Right"><ArrowRight size={16} /></button>
      </div>
      <p className="mt-3 text-xs text-muted">Arrows / WASD. Eat the bugs, dodge yourself.</p>
      {phase !== 'run' && <button className="btn btn-primary mt-3" onClick={start}>{phase === 'dead' ? `Crashed at ${score} · Retry` : 'Start'}</button>}
    </div>
  )
}

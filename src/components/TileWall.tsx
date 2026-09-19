import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useScroll, useTransform, motion } from 'motion/react'
import { TechIcon, hasBrand } from '../lib/icons'
import { useC } from '../store/content'
import { useThemeState } from '../theme/useTheme'
import { play } from '../lib/sound'
import { prefersReducedMotion } from '../lib/utils'
import { HiddenBug } from './kit'

/** Glazed Peranakan-style tiles, or circuit tiles in the Cyberpunk theme. Colours come from theme tokens. */
function Motif({ kind, a, b, circuit }: { kind: number; a: string; b: string; circuit?: boolean }) {
  if (circuit) {
    const line = { fill: 'none', stroke: a, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
    switch (kind % 4) {
      case 0: return (<g><path d="M8 32 24 16 40 32" {...line} /><path d="M8 40 24 24 40 40" {...line} stroke={b} opacity=".7" /><circle cx="24" cy="10" r="3" fill={b} /></g>)
      case 1: return (<g><path d="M6 24h12V12h14" {...line} /><path d="M18 24v14h24" {...line} stroke={b} /><circle cx="32" cy="12" r="3.2" fill={a} /><circle cx="42" cy="38" r="3.2" fill={b} /><circle cx="6" cy="24" r="3.2" fill={a} /></g>)
      case 2: return (<g><path d="M24 6 39 15v18L24 42 9 33V15Z" {...line} /><path d="M24 15 32 20v9l-8 5-8-5v-9Z" {...line} stroke={b} /><circle cx="24" cy="24.5" r="3" fill={a} /></g>)
      default: return (<g><rect x="8" y="8" width="32" height="32" rx="3" {...line} /><rect x="16" y="16" width="16" height="16" rx="2" {...line} stroke={b} /><path d="M4 14v-6h6M44 34v6h-6" {...line} stroke={b} /><circle cx="24" cy="24" r="2.6" fill={a} /></g>)
    }
  }
  switch (kind % 4) {
    case 0: // four petals
      return (<g>{[0, 90, 180, 270].map((r) => <ellipse key={r} cx="24" cy="12" rx="6" ry="10" fill={a} transform={`rotate(${r} 24 24)`} />)}<circle cx="24" cy="24" r="5" fill={b} /></g>)
    case 1: // diamond with corner quarters
      return (<g><path d="M24 4 44 24 24 44 4 24Z" fill={a} /><path d="M24 13 35 24 24 35 13 24Z" fill={b} />{[[0, 0], [48, 0], [0, 48], [48, 48]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="8" fill={b} />)}</g>)
    case 2: // eight-point star
      return (<g><rect x="8" y="8" width="32" height="32" fill={a} /><rect x="8" y="8" width="32" height="32" fill={a} transform="rotate(45 24 24)" /><circle cx="24" cy="24" r="7" fill={b} /></g>)
    default: // rings and dots
      return (<g><circle cx="24" cy="24" r="17" fill="none" stroke={a} strokeWidth="5" /><circle cx="24" cy="24" r="7" fill={b} />{[[6, 6], [42, 6], [6, 42], [42, 42]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3.5" fill={a} />)}</g>)
  }
}

const TONES = ['var(--primary)', 'var(--accent)', 'var(--sun)', 'var(--cobalt)']

/** A wall of tiles. Hover or tap a tile to flip it and reveal a tool from my loadout. It drifts slowly as you scroll. */
export function TileWall({ rows = 4 }: { rows?: number }) {
  const c = useC()
  const { cyber } = useThemeState()
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(900)
  const [open, setOpen] = useState<Set<number>>(new Set())
  const icons = useMemo(() => c.skills.flatMap((g) => g.skills).filter((s) => hasBrand(s.icon)), [c.skills])
  const { scrollY } = useScroll()
  const drift = useTransform(scrollY, [0, 700], [0, prefersReducedMotion() ? 0 : 110])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cols = Math.max(6, Math.round(w / 84))
  const size = w / cols
  const count = cols * rows

  const flip = useCallback((i: number) => {
    setOpen((s) => new Set(s).add(i))
    play('flip', { rate: 0.9 + (i % 5) * 0.08 })
    setTimeout(() => setOpen((s) => { const n = new Set(s); n.delete(i); return n }), 2400)
  }, [])

  // One quiet tile turns over now and then so the wall reads as tactile, not decorative.
  useEffect(() => {
    if (prefersReducedMotion()) return
    const id = setInterval(() => {
      const i = Math.floor(Math.random() * count)
      setOpen((s) => new Set(s).add(i))
      setTimeout(() => setOpen((s) => { const n = new Set(s); n.delete(i); return n }), 1800)
    }, 3800)
    return () => clearInterval(id)
  }, [count])

  return (
    <div ref={ref} className="relative w-full select-none overflow-hidden" style={{ height: size * rows }} role="group" aria-label="Decorative tile wall. Tiles flip to reveal tools.">
      <HiddenBug id="b1" className="right-6 top-4" />
      <motion.div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, ${size}px)`, y: drift, marginTop: -30, height: size * rows + 60, alignContent: 'start' }}>
        {Array.from({ length: count + cols }, (_, i) => {
          const row = Math.floor(i / cols)
          const col = i % cols
          const kind = (row + col) % 4
          const skill = icons[i % Math.max(icons.length, 1)]
          const a = TONES[(row * 2 + col) % 4]
          const b = TONES[(row * 2 + col + 2) % 4]
          const flipped = open.has(i)
          return (
            <button
              key={i}
              onPointerEnter={(e) => { if (e.pointerType === 'mouse') flip(i) }}
              onClick={() => flip(i)}
              aria-label={skill ? `Tile. Flip to reveal ${skill.name}` : 'Tile'}
              tabIndex={row === 0 || row > rows ? -1 : 0}
              className="relative outline-offset-[-3px] [perspective:600px]"
              style={{ width: size, height: size }}
            >
              <span className="absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d]" style={{ transform: flipped ? 'rotateY(180deg)' : 'none' }}>
                <span className="absolute inset-[1.5px] overflow-hidden rounded-[3px] [backface-visibility:hidden]" style={{ background: `color-mix(in srgb, var(--primary) ${cyber ? 9 : 16}%, var(--surface))`, boxShadow: cyber ? `inset 0 0 0 1px color-mix(in srgb, ${a} 35%, transparent)` : undefined }}>
                  <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden><Motif kind={kind} a={a} b={b} circuit={cyber} /></svg>
                </span>
                <span className="absolute inset-[1.5px] grid place-items-center rounded-[3px] bg-surface text-ink [backface-visibility:hidden] [transform:rotateY(180deg)]" style={{ boxShadow: cyber ? `0 0 22px -4px ${b}, inset 0 0 0 1px ${b}` : undefined }}>
                  {skill && (
                    <span className="flex flex-col items-center gap-1">
                      <TechIcon name={skill.icon} size={Math.max(22, size * 0.36)} />
                      <span className="text-[10px] font-semibold text-muted">{skill.name}</span>
                    </span>
                  )}
                </span>
              </span>
            </button>
          )
        })}
      </motion.div>
    </div>
  )
}

/** Static tile pattern used as a texture on project covers. */
export function TilePattern({ tone, kind = 0 }: { tone: string; kind?: number }) {
  const { cyber } = useThemeState()
  return (
    <svg className="absolute inset-0 h-full w-full" aria-hidden preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id={`tp-${kind}-${cyber ? 'c' : 'n'}`} width="48" height="48" patternUnits="userSpaceOnUse">
          <Motif kind={kind} a="rgb(255 255 255 / .2)" b="rgb(255 255 255 / .1)" circuit={cyber} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={tone} />
      <rect width="100%" height="100%" fill={`url(#tp-${kind}-${cyber ? 'c' : 'n'})`} />
    </svg>
  )
}

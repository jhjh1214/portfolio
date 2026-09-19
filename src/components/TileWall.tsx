import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TechIcon, hasBrand } from '../lib/icons'
import { useC } from '../store/content'
import { play } from '../lib/sound'
import { prefersReducedMotion } from '../lib/utils'
import { HiddenBug } from './kit'

/** Four glazed-tile motifs in the spirit of Peranakan shophouse tiles. Colours come from theme tokens. */
function Motif({ kind, a, b }: { kind: number; a: string; b: string }) {
  switch (kind % 4) {
    case 0: // four petals
      return (
        <g>
          {[0, 90, 180, 270].map((r) => <ellipse key={r} cx="24" cy="12" rx="6" ry="10" fill={a} transform={`rotate(${r} 24 24)`} />)}
          <circle cx="24" cy="24" r="5" fill={b} />
        </g>
      )
    case 1: // diamond with corner quarters
      return (
        <g>
          <path d="M24 4 44 24 24 44 4 24Z" fill={a} />
          <path d="M24 13 35 24 24 35 13 24Z" fill={b} />
          {[[0, 0], [48, 0], [0, 48], [48, 48]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="8" fill={b} />)}
        </g>
      )
    case 2: // eight-point star
      return (
        <g>
          <rect x="8" y="8" width="32" height="32" fill={a} />
          <rect x="8" y="8" width="32" height="32" fill={a} transform="rotate(45 24 24)" />
          <circle cx="24" cy="24" r="7" fill={b} />
        </g>
      )
    default: // rings and dots
      return (
        <g>
          <circle cx="24" cy="24" r="17" fill="none" stroke={a} strokeWidth="5" />
          <circle cx="24" cy="24" r="7" fill={b} />
          {[[6, 6], [42, 6], [6, 42], [42, 42]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3.5" fill={a} />)}
        </g>
      )
  }
}

const TONES = ['var(--primary)', 'var(--accent)', 'var(--sun)', 'var(--cobalt)']

/** A wall of tiles. Hover or tap a tile to flip it and reveal a tool from my loadout. */
export function TileWall({ rows = 4 }: { rows?: number }) {
  const c = useC()
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(900)
  const [open, setOpen] = useState<Set<number>>(new Set())
  const icons = useMemo(() => c.skills.flatMap((g) => g.skills).filter((s) => hasBrand(s.icon)), [c.skills])

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
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, ${size}px)` }}>
        {Array.from({ length: count }, (_, i) => {
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
              className="relative outline-offset-[-3px] [perspective:600px]"
              style={{ width: size, height: size }}
            >
              <span className="absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d]" style={{ transform: flipped ? 'rotateY(180deg)' : 'none' }}>
                <span className="absolute inset-[1.5px] overflow-hidden rounded-[3px] [backface-visibility:hidden]" style={{ background: 'color-mix(in srgb, var(--primary) 16%, var(--surface))' }}>
                  <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden><Motif kind={kind} a={a} b={b} /></svg>
                </span>
                <span className="absolute inset-[1.5px] grid place-items-center rounded-[3px] bg-surface text-ink [backface-visibility:hidden] [transform:rotateY(180deg)]">
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
      </div>
    </div>
  )
}

/** Static tile pattern used as a texture on project covers. */
export function TilePattern({ tone, kind = 0 }: { tone: string; kind?: number }) {
  return (
    <svg className="absolute inset-0 h-full w-full" aria-hidden preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id={`tp-${kind}`} width="48" height="48" patternUnits="userSpaceOnUse">
          <Motif kind={kind} a="rgb(255 255 255 / .16)" b="rgb(0 0 0 / .14)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={tone} />
      <rect width="100%" height="100%" fill={`url(#tp-${kind})`} />
    </svg>
  )
}

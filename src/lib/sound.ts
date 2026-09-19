import { Howl, Howler } from 'howler'

/**
 * UI sound effects: Kenney "Interface Sounds" (CC0), served from /sfx and played through Howler.
 * Sounds load lazily on first use so they cost nothing until someone interacts.
 */
const FILES = {
  click: ['click_003', 0.5],
  tick: ['tick_001', 0.25],
  select: ['select_007', 0.5],
  open: ['open_001', 0.45],
  close: ['close_001', 0.4],
  toggle: ['toggle_002', 0.5],
  flip: ['glass_002', 0.55],
  chime: ['confirmation_004', 0.55],
  win: ['confirmation_001', 0.5],
  error: ['error_004', 0.4],
  hit: ['drop_001', 0.55],
  glitch: ['glitch_002', 0.5],
  bong: ['bong_001', 0.5],
  whoosh: ['maximize_003', 0.4],
  pluck: ['pluck_001', 0.5],
  ask: ['question_002', 0.4],
} as const
export type SfxName = keyof typeof FILES

const cache = new Map<SfxName, Howl>()
let muted = false
let last = 0

const base = () => import.meta.env.BASE_URL.replace(/\/$/, '') || '.'

function get(name: SfxName) {
  let h = cache.get(name)
  if (!h) {
    const [file, volume] = FILES[name]
    h = new Howl({ src: [`${base()}/sfx/${file}.wav`], volume, preload: true, html5: false })
    cache.set(name, h)
  }
  return h
}

export const setMuted = (m: boolean) => {
  muted = m
  Howler.mute(m)
}
export const isMuted = () => muted

/** Play a named effect. Rate-limited so rapid taps don't stack into noise. */
export function play(name: SfxName, opts: { rate?: number } = {}) {
  if (muted) return
  const now = performance.now()
  if (name === 'tick' && now - last < 70) return
  last = now
  const h = get(name)
  if (opts.rate) h.rate(opts.rate)
  else h.rate(1)
  h.play()
}

export const sfx = {
  unlock: () => play('chime'),
  blip: () => play('click'),
  hit: () => play('hit'),
  bad: () => play('error'),
  win: () => play('win'),
}

let ctx: AudioContext | null = null
function tone(freq: number, start: number, dur: number, vol = 0.05, type: OscillatorType = 'sine') {
  if (!ctx) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0, ctx.currentTime + start)
  g.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur)
  o.connect(g).connect(ctx.destination)
  o.start(ctx.currentTime + start)
  o.stop(ctx.currentTime + start + dur + 0.05)
}
function ready(): boolean {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return true
  } catch {
    return false
  }
}
let muted = false
export const setMuted = (m: boolean) => { muted = m }
const play = (fn: () => void) => { if (!muted && ready()) fn() }

export const sfx = {
  /** Steam-ish achievement chime. */
  unlock: () => play(() => { tone(660, 0, 0.18); tone(880, 0.1, 0.18); tone(1320, 0.2, 0.4, 0.04) }),
  blip: () => play(() => tone(520, 0, 0.08, 0.04, 'square')),
  hit: () => play(() => { tone(300, 0, 0.09, 0.05, 'square'); tone(180, 0.05, 0.1, 0.04, 'square') }),
  bad: () => play(() => tone(120, 0, 0.25, 0.06, 'sawtooth')),
  win: () => play(() => { tone(523, 0, 0.12); tone(659, 0.1, 0.12); tone(784, 0.2, 0.25) }),
}

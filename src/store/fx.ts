import { create } from 'zustand'
import confetti from 'canvas-confetti'

export type Fx = 'matrix' | 'flood' | 'flip' | null
interface FxState {
  fx: Fx
  terminal: boolean
  play: (fx: Exclude<Fx, null>, ms: number) => void
  setTerminal: (v: boolean) => void
}
let timer: ReturnType<typeof setTimeout> | undefined

export const useFx = create<FxState>((set) => ({
  fx: null,
  terminal: false,
  play: (fx, ms) => {
    clearTimeout(timer)
    set({ fx })
    timer = setTimeout(() => set({ fx: null }), ms)
  },
  setTerminal: (terminal) => set({ terminal }),
}))

export function burst(colors = ['#8b5cf6', '#db2777', '#67e8f9', '#f59e0b']) {
  const shoot = (origin: { x: number; y: number }, angle: number) =>
    confetti({ particleCount: 90, spread: 70, startVelocity: 55, origin, angle, colors, ticks: 220 })
  shoot({ x: 0, y: 0.75 }, 60)
  shoot({ x: 1, y: 0.75 }, 120)
}

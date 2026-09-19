import { useProgress } from '../store/progress'

/** Shared score/XP plumbing: 5 XP per finished round, +15 for a new personal best. */
export function useReport(game: string) {
  const markPlayed = useProgress((s) => s.markPlayed)
  const setScore = useProgress((s) => s.setScore)
  const addXp = useProgress((s) => s.addXp)
  const best = useProgress((s) => s.scores[game])
  return {
    best,
    started: () => markPlayed(game),
    finish: (score: number, lowerIsBetter = false) => {
      const isBest = setScore(game, score, lowerIsBetter)
      addXp(isBest ? 20 : 5)
      return isBest
    },
  }
}

/** Level curve: level n needs 50*(n-1)^2 total XP. */
export const levelFromXp = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1
export const xpForLevel = (level: number) => 50 * (level - 1) ** 2
export function levelProgress(xp: number) {
  const level = levelFromXp(xp)
  const floor = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return { level, into: xp - floor, span: next - floor, pct: (xp - floor) / (next - floor) }
}

/** Age in whole years from a birth year and month (1-12). Returns null when either is unset. */
export function ageFrom(birthYear: number, birthMonth: number, now: Date = new Date()): number | null {
  if (!birthYear || !birthMonth || birthMonth < 1 || birthMonth > 12 || birthYear > now.getFullYear()) return null
  // Without a day we assume the birthday is on the 1st: the age ticks over at the start of the birth month.
  let age = now.getFullYear() - birthYear
  if (now.getMonth() + 1 < birthMonth) age -= 1
  return age >= 0 ? age : null
}

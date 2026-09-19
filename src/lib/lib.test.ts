import { describe, it, expect } from 'vitest'
import { levelFromXp, xpForLevel, levelProgress } from './level'
import { createSequenceMatcher, KONAMI, word } from './sequence'
import { bestMove, winner, type Board } from './tictactoe'
import { normalize } from './normalize'
import { ageFrom } from './age'
import { isCurrent, published } from '../store/content'
import content from '../content/content.json'
import type { Content } from '../types'

describe('level curve', () => {
  it('starts at level 1 and has matching thresholds', () => {
    expect(levelFromXp(0)).toBe(1)
    expect(levelFromXp(-5)).toBe(1)
    for (let l = 1; l < 20; l++) {
      expect(levelFromXp(xpForLevel(l))).toBe(l)
      expect(levelFromXp(xpForLevel(l + 1) - 1)).toBe(l)
    }
  })
  it('progress fraction stays within [0,1)', () => {
    const p = levelProgress(120)
    expect(p.pct).toBeGreaterThanOrEqual(0)
    expect(p.pct).toBeLessThan(1)
  })
})

describe('sequence matcher', () => {
  it('fires on the konami code, not on a near miss', () => {
    const m = createSequenceMatcher(KONAMI)
    expect(KONAMI.map(m).at(-1)).toBe(true)
    const m2 = createSequenceMatcher(KONAMI)
    expect([...KONAMI.slice(0, 9), 'x'].map(m2).some(Boolean)).toBe(false)
  })
  it('matches a typed word mid-stream, case-insensitively', () => {
    const m = createSequenceMatcher(word('banjir'))
    expect([...'xxBanJiRyy'].map(m).filter(Boolean)).toHaveLength(1)
  })
})

describe('tic-tac-toe AI', () => {
  it('never loses against any sequence of human moves (exhaustive)', () => {
    let games = 0
    const play = (b: Board, humanTurn: boolean) => {
      const w = winner(b)
      if (w) {
        games++
        expect(w).not.toBe('X')
        return
      }
      if (humanTurn) {
        for (let i = 0; i < 9; i++) if (!b[i]) { const n = [...b]; n[i] = 'X'; play(n, false) }
      } else {
        const n = [...b]
        n[bestMove(b)] = 'O'
        play(n, true)
      }
    }
    play(Array(9).fill(null), true)
    expect(games).toBeGreaterThan(100)
  })
  it('always takes an available immediate win (over slower forced wins), on every legal position', () => {
    let checked = 0
    for (let n = 0; n < 3 ** 9; n++) {
      const b: Board = Array.from({ length: 9 }, (_, i) => ([null, 'X', 'O'] as const)[Math.floor(n / 3 ** i) % 3])
      const xs = b.filter((c) => c === 'X').length
      const os = b.filter((c) => c === 'O').length
      if (xs !== os + 1 || winner(b)) continue
      const wins = b.flatMap((c, i) => { if (c) return []; const t = [...b]; t[i] = 'O'; return winner(t) === 'O' ? [i] : [] })
      if (!wins.length) continue
      checked++
      expect(wins).toContain(bestMove(b))
    }
    expect(checked).toBeGreaterThan(50)
  })
  it('takes an immediate win and blocks an immediate loss', () => {
    expect(bestMove(['O', 'O', null, 'X', 'X', null, null, null, null])).toBe(2)
    expect(bestMove(['X', 'X', null, null, 'O', null, null, null, null])).toBe(2)
  })
})

describe('normalize', () => {
  const base = { a: 1, b: { c: 'x', d: [1] }, e: true }
  it('fills missing keys and rejects wrong types', () => {
    expect(normalize(base, { a: 'nope', b: { c: 'y' } })).toEqual({ a: 1, b: { c: 'y', d: [1] }, e: true })
  })
  it('replaces arrays wholesale and tolerates garbage input', () => {
    expect(normalize(base, { b: { d: [] } }).b.d).toEqual([])
    expect(normalize(base, null)).toEqual(base)
    expect(normalize(base, 'x')).toEqual(base)
  })
})

describe('bundled content', () => {
  const c = content as unknown as Content
  it('has unique ids and known section ids', () => {
    for (const list of [c.projects, c.journey, c.achievements, c.openSource, c.albums, c.eggs]) {
      const ids = list.map((x) => x.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
    const known = ['showcase', 'projects', 'journey', 'achievements', 'opensource', 'skills', 'album', 'arcade', 'contact']
    c.sections.forEach((s) => expect(known).toContain(s.id))
  })
  it('survives normalization against itself unchanged', () => {
    expect(normalize(c, c)).toEqual(c)
  })
})

describe('age', () => {
  it('counts whole years and ticks over in the birth month', () => {
    expect(ageFrom(2003, 6, new Date(2026, 5, 1))).toBe(23) // June 2026, born June 2003
    expect(ageFrom(2003, 6, new Date(2026, 4, 31))).toBe(22) // one day earlier
    expect(ageFrom(2003, 12, new Date(2026, 0, 15))).toBe(22)
  })
  it('is null when unset or impossible, never a wrong number', () => {
    expect(ageFrom(0, 0)).toBeNull()
    expect(ageFrom(2003, 0)).toBeNull()
    expect(ageFrom(2003, 13)).toBeNull()
    expect(ageFrom(2999, 5)).toBeNull()
  })
})

describe('content versioning', () => {
  it('bundled content declares a version', () => {
    expect((content as unknown as Content).version).toBeGreaterThanOrEqual(2)
  })
  it('only accepts cached or published content written for the current version', () => {
    expect(isCurrent({ ...published })).toBe(true)
    expect(isCurrent({ ...published, version: published.version - 1 })).toBe(false)
    expect(isCurrent({ ...published, version: published.version + 1 })).toBe(false)
    const { version: _v, ...noVersion } = published
    expect(isCurrent(noVersion)).toBe(false) // content saved before versioning existed
    for (const junk of [null, undefined, 'x', 3, []]) expect(isCurrent(junk)).toBe(false)
  })
})

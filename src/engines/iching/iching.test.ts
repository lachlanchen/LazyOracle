import { describe, expect, it } from 'vitest'
import { castHexagram, hexagramByNumber, hexagramFromLines } from './cast'
import { HEXAGRAMS, TRIGRAMS } from './data'

describe('hexagram table', () => {
  it('has 64 distinct hexagrams whose line patterns are all different', () => {
    expect(HEXAGRAMS).toHaveLength(64)
    const patterns = new Set(HEXAGRAMS.map((h) => [...TRIGRAMS[h.lower].lines, ...TRIGRAMS[h.upper].lines].join('')))
    expect(patterns.size).toBe(64)
    expect(HEXAGRAMS.map((h) => h.number)).toEqual(Array.from({ length: 64 }, (_, i) => i + 1))
  })

  it('matches well-known hexagrams', () => {
    expect(hexagramFromLines([1, 1, 1, 1, 1, 1]).name.zh).toBe('乾')
    expect(hexagramFromLines([0, 0, 0, 0, 0, 0]).name.zh).toBe('坤')
    // 泰: heaven below, earth above.
    expect(hexagramFromLines([1, 1, 1, 0, 0, 0]).number).toBe(11)
    // 既济: fire below, water above.
    expect(hexagramFromLines([1, 0, 1, 0, 1, 0]).number).toBe(63)
    expect(hexagramByNumber(64).name.en).toBe('Before Completion')
    expect(hexagramByNumber(3).lowerTrigram.name.zh).toBe('震')
    expect(hexagramByNumber(3).upperTrigram.name.zh).toBe('坎')
    for (const h of HEXAGRAMS) {
      expect(h.judgement.length).toBeGreaterThan(1)
      expect(h.keywords.zh.length).toBeGreaterThanOrEqual(2)
      expect(h.keywords.en.length).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('casting', () => {
  it('is reproducible from its seed and derives the resulting hexagram from the changing lines', () => {
    const a = castHexagram({ seed: 99, now: new Date(0) })
    const b = castHexagram({ seed: 99, now: new Date(0) })
    expect(b.lines.map((l) => l.value)).toEqual(a.lines.map((l) => l.value))
    expect(a.lines).toHaveLength(6)
    for (const [index, line] of a.lines.entries()) {
      expect(line.yang).toBe(line.value % 2 === 1)
      expect(line.changing).toBe(line.value === 6 || line.value === 9)
      expect(a.primary.lines[index]).toBe(line.yang ? 1 : 0)
      if (a.resulting) expect(a.resulting.lines[index]).toBe((line.changing ? !line.yang : line.yang) ? 1 : 0)
    }
    expect(a.changingPositions).toEqual(a.lines.map((l, i) => (l.changing ? i + 1 : 0)).filter(Boolean))
    if (a.changingPositions.length === 0) expect(a.resulting).toBeNull()
  })

  it('follows the coin and yarrow probabilities over many casts', () => {
    const count = (method: 'coins' | 'yarrow') => {
      const tally = { 6: 0, 7: 0, 8: 0, 9: 0 }
      for (let seed = 0; seed < 2000; seed += 1) for (const line of castHexagram({ method, seed }).lines) tally[line.value] += 1
      const total = 2000 * 6
      return { 6: tally[6] / total, 7: tally[7] / total, 8: tally[8] / total, 9: tally[9] / total }
    }
    const coins = count('coins')
    expect(coins[6]).toBeCloseTo(1 / 8, 1)
    expect(coins[7]).toBeCloseTo(3 / 8, 1)
    const yarrow = count('yarrow')
    expect(yarrow[6]).toBeCloseTo(1 / 16, 1)
    expect(yarrow[8]).toBeCloseTo(7 / 16, 1)
  })
})

import { expect, test } from 'vitest'
import { exploreHexagram } from './explore'

test('all 4096 constructions preserve unchanged lines and flip exactly the chosen positions', () => {
  for (let number = 1; number <= 64; number++) {
    for (let mask = 0; mask < 64; mask++) {
      const positions = [1, 2, 3, 4, 5, 6].filter((p) => mask & (1 << (p - 1)))
      const result = exploreHexagram(number, positions)
      expect(result.resulting.lines).toEqual(result.primary.lines.map((line, i) => positions.includes(i + 1) ? 1 - line : line))
      expect(exploreHexagram(result.resulting.number, positions).resulting.number).toBe(number)
      expect(result.construction.filter((line) => line.changed).map((line) => line.position)).toEqual(positions)
    }
  }
})

test('known figures verify line orientation and transformations independently', () => {
  expect(exploreHexagram(1, [1, 2, 3, 4, 5, 6]).resulting.number).toBe(2)
  expect(exploreHexagram(1, [1]).resulting.number).toBe(44)
  expect(exploreHexagram(1, [6]).resulting.number).toBe(43)
  const peace = exploreHexagram(11)
  expect(peace.primary.lines).toEqual([1, 1, 1, 0, 0, 0])
  expect(peace.primary.lowerTrigram.id).toBe('qian')
  expect(peace.primary.upperTrigram.id).toBe('kun')
  expect(peace.nuclear.lines).toEqual([1, 1, 0, 1, 0, 0])
  expect(peace.opposite.number).toBe(12)
  expect(peace.inverse.number).toBe(12)
})

test('manual exploration rejects malformed input and never adds a random seed or timestamp', () => {
  for (const number of [0, 65, 1.5, NaN]) expect(() => exploreHexagram(number)).toThrow()
  for (const positions of [[0], [7], [1.2]]) expect(() => exploreHexagram(1, positions)).toThrow()
  const result = exploreHexagram(11, [6, 1, 6])
  expect(result).toEqual(exploreHexagram(11, [1, 6]))
  expect(result).not.toHaveProperty('seed')
  expect(result).not.toHaveProperty('castAt')
})

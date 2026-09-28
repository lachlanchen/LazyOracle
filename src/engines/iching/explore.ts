import { hexagramByNumber, hexagramFromLines, inverseHexagram, nuclearHexagram, oppositeHexagram } from './cast'
import type { Line } from './data'

/** A deliberate construction, separate from casting and its reading-focus rules. */
export function exploreHexagram(number: number, changing: number[] = []) {
  if (!Number.isInteger(number) || number < 1 || number > 64) throw new Error('number must be 1–64')
  if (!Array.isArray(changing) || changing.some((p) => !Number.isInteger(p) || p < 1 || p > 6)) throw new Error('line positions must be 1–6')
  const positions = [...new Set(changing)].sort((a, b) => a - b)
  const primary = hexagramByNumber(number)
  const resulting = hexagramFromLines(primary.lines.map((line, i) => positions.includes(i + 1) ? 1 - line as Line : line))
  return {
    kind: 'iching-study', version: 1, primary, resulting, changingPositions: positions,
    nuclear: nuclearHexagram(primary.lines), opposite: oppositeHexagram(primary.lines), inverse: inverseHexagram(primary.lines),
    construction: primary.lines.map((line, i) => ({ position: i + 1, before: line, after: resulting.lines[i], changed: positions.includes(i + 1) })),
  }
}

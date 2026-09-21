import { mulberry32, randomSeed } from '../tarot/draw'
import { HEXAGRAMS, LINE_POSITIONS, TRIGRAMS, type HexagramData, type Line, type Trigram } from './data'

/** A cast line: 6 old yin (changing), 7 young yang, 8 young yin, 9 old yang (changing). */
export type LineValue = 6 | 7 | 8 | 9

export interface CastLine {
  value: LineValue
  /** The line as it stands in the primary hexagram. */
  yang: boolean
  changing: boolean
  /** Coin faces for the three-coin method (3 = heads = yang worth 3, tails worth 2). */
  coins?: [boolean, boolean, boolean]
}

export interface Hexagram extends HexagramData {
  lines: Line[]
  lowerTrigram: Trigram
  upperTrigram: Trigram
}

export interface IChingCast {
  method: 'coins' | 'yarrow'
  seed: number
  question: string
  castAt: string
  lines: CastLine[]
  primary: Hexagram
  /** The hexagram after the changing lines move, or null when nothing changes. */
  resulting: Hexagram | null
  changingPositions: number[]
}

const BY_LINES = new Map<string, HexagramData>(HEXAGRAMS.map((h) => [[...TRIGRAMS[h.lower].lines, ...TRIGRAMS[h.upper].lines].join(''), h]))

export function hexagramFromLines(lines: Line[]): Hexagram {
  const data = BY_LINES.get(lines.join(''))
  if (!data) throw new Error(`no hexagram for lines ${lines.join('')}`)
  return { ...data, lines, lowerTrigram: TRIGRAMS[data.lower], upperTrigram: TRIGRAMS[data.upper] }
}

export function hexagramByNumber(number: number): Hexagram {
  const data = HEXAGRAMS[number - 1]
  return hexagramFromLines([...TRIGRAMS[data.lower].lines, ...TRIGRAMS[data.upper].lines])
}

/** Three-coin method: each coin is 3 (heads) or 2 (tails); the sum 6–9 is the line. */
function castCoinLine(next: () => number): CastLine {
  const coins: [boolean, boolean, boolean] = [next() < 0.5, next() < 0.5, next() < 0.5]
  const value = coins.reduce<number>((sum, heads) => sum + (heads ? 3 : 2), 0) as LineValue
  return { value, yang: value % 2 === 1, changing: value === 6 || value === 9, coins }
}

/**
 * Yarrow-stalk probabilities (1/16 old yin, 5/16 young yang, 7/16 young yin,
 * 3/16 old yang), simulated rather than counted stalk by stalk.
 */
function castYarrowLine(next: () => number): CastLine {
  const roll = Math.floor(next() * 16)
  const value: LineValue = roll < 1 ? 6 : roll < 6 ? 7 : roll < 13 ? 8 : 9
  return { value, yang: value % 2 === 1, changing: value === 6 || value === 9 }
}

export interface CastOptions {
  method?: 'coins' | 'yarrow'
  seed?: number
  question?: string
  now?: Date
}

export function castHexagram(options: CastOptions = {}): IChingCast {
  const method = options.method ?? 'coins'
  const seed = options.seed ?? randomSeed()
  const next = mulberry32(seed)
  const lines: CastLine[] = []
  for (let index = 0; index < 6; index += 1) lines.push(method === 'coins' ? castCoinLine(next) : castYarrowLine(next))
  const primaryLines = lines.map((line) => (line.yang ? 1 : 0) as Line)
  const primary = hexagramFromLines(primaryLines)
  const changingPositions = lines.map((line, index) => (line.changing ? index + 1 : 0)).filter(Boolean)
  const resulting = changingPositions.length
    ? hexagramFromLines(lines.map((line) => ((line.changing ? !line.yang : line.yang) ? 1 : 0) as Line))
    : null
  return { method, seed, question: (options.question ?? '').trim(), castAt: (options.now ?? new Date()).toISOString(), lines, primary, resulting, changingPositions }
}

export function linePositionText(position: number, language: 'zh' | 'en'): string {
  return LINE_POSITIONS[position - 1][language]
}

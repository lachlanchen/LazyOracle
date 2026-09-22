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

/**
 * Which text answers the question, by the rule Zhu Xi set out in the
 * 《易学启蒙》 and which most readers still follow. The number of moving lines
 * decides where the answer is read, not the caster's preference.
 */
export interface ReadingFocus {
  kind: 'judgement' | 'line' | 'two-lines' | 'both-judgements' | 'resulting-lines' | 'resulting-judgement'
  /** Line positions to read, in the order they should be read. */
  positions: number[]
  /** Whether those positions belong to the primary or the resulting hexagram. */
  from: 'primary' | 'resulting'
  rule: { zh: string; en: string }
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
  /** 互卦: the hexagram hidden inside lines two to five. */
  nuclear: Hexagram
  /** 错卦: every line turned into its opposite. */
  opposite: Hexagram
  /** 综卦: the hexagram seen from the other side, turned upside down. */
  inverse: Hexagram
  focus: ReadingFocus
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

/** 互卦: lines 2-3-4 become the lower trigram, 3-4-5 the upper. */
export function nuclearHexagram(lines: Line[]): Hexagram {
  return hexagramFromLines([lines[1], lines[2], lines[3], lines[2], lines[3], lines[4]])
}

/** 错卦: yin for yang throughout, the hexagram's counterpart. */
export function oppositeHexagram(lines: Line[]): Hexagram {
  return hexagramFromLines(lines.map((line) => (line ? 0 : 1) as Line))
}

/** 综卦: the same hexagram as the other party to the situation sees it. */
export function inverseHexagram(lines: Line[]): Hexagram {
  return hexagramFromLines([...lines].reverse())
}

/**
 * The classical rule for where the answer is read. With no moving line the
 * judgement stands; with one, that line speaks; with two, the upper of them
 * leads; with three, the middle one; with four, the two still lines of the
 * resulting hexagram, lower first; with five, its single still line; with six,
 * the resulting hexagram's own judgement (for 乾 and 坤, 用九 and 用六).
 */
export function readingFocus(changing: number[]): ReadingFocus {
  const sorted = [...changing].sort((a, b) => a - b)
  switch (sorted.length) {
    case 0:
      return { kind: 'judgement', positions: [], from: 'primary', rule: { zh: '无变爻：以本卦卦辞为断。', en: 'No moving line: the judgement of the primary hexagram answers.' } }
    case 1:
      return { kind: 'line', positions: sorted, from: 'primary', rule: { zh: '一爻变：以该变爻之辞为断。', en: 'One moving line: that line answers.' } }
    case 2:
      return { kind: 'two-lines', positions: [sorted[1], sorted[0]], from: 'primary', rule: { zh: '二爻变：以两变爻为断，上爻为主。', en: 'Two moving lines: both speak, and the upper one leads.' } }
    case 3:
      return { kind: 'both-judgements', positions: [sorted[1]], from: 'primary', rule: { zh: '三爻变：以本卦与之卦卦辞为断，本卦为主，中间一爻为参。', en: 'Three moving lines: both judgements answer, the primary leading, with the middle moving line as guide.' } }
    case 4: {
      const still = [1, 2, 3, 4, 5, 6].filter((position) => !sorted.includes(position))
      return { kind: 'resulting-lines', positions: still, from: 'resulting', rule: { zh: '四爻变：以之卦中两不变爻之辞为断，下爻为主。', en: 'Four moving lines: the two still lines of the resulting hexagram answer, the lower one leading.' } }
    }
    case 5: {
      const still = [1, 2, 3, 4, 5, 6].filter((position) => !sorted.includes(position))
      return { kind: 'resulting-lines', positions: still, from: 'resulting', rule: { zh: '五爻变：以之卦中唯一不变爻之辞为断。', en: 'Five moving lines: the single still line of the resulting hexagram answers.' } }
    }
    default:
      return { kind: 'resulting-judgement', positions: [], from: 'resulting', rule: { zh: '六爻皆变：以之卦卦辞为断（乾坤则用九、用六）。', en: 'Every line moves: the resulting hexagram\'s judgement answers (for 乾 and 坤, the special texts 用九 and 用六).' } }
  }
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
  return {
    method,
    seed,
    question: (options.question ?? '').trim(),
    castAt: (options.now ?? new Date()).toISOString(),
    lines,
    primary,
    resulting,
    changingPositions,
    nuclear: nuclearHexagram(primaryLines),
    opposite: oppositeHexagram(primaryLines),
    inverse: inverseHexagram(primaryLines),
    focus: readingFocus(changingPositions),
  }
}

export function linePositionText(position: number, language: 'zh' | 'en'): string {
  return LINE_POSITIONS[position - 1][language]
}

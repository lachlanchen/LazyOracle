/**
 * One entry point into every engine, for a native app to call.
 *
 * The native iOS and Android apps will draw their own screens, but they must
 * not re-implement the rules: a second copy of the four pillars or the almanac
 * would drift from this one, and no test would catch it. Instead they load the
 * bundle built from this file into JavaScriptCore or QuickJS and call one
 * function with JSON in and JSON out.
 *
 *     const result = LazyOracle.evaluate('almanac.day', { date: '2026-09-23' })
 *
 * Every engine here is already pure: same input, same output, no interface and
 * no storage. That is what makes this bridge a thin wrapper rather than a
 * second implementation.
 */
import { almanacFor, ACTIVITIES, judgeActivity, luckyHours } from './engines/almanac/almanac'
import { openBook } from './engines/answers/answers'
import { computeChart, transitsFor } from './engines/astrology/astrology'
import { computeBazi } from './engines/bazi/bazi'
import { eightMansions, sectorForHeading } from './engines/fengshui/fengshui'
import { faceFeatures } from './engines/face/face'
import { castHexagram, hexagramByNumber } from './engines/iching/cast'
import { palmFeatures } from './engines/palm/palm'
import { drawSpread } from './engines/tarot/draw'
import { SPREADS } from './engines/tarot/spreads'

/** The version of this contract. Native code checks it before trusting a result. */
export const BRIDGE_VERSION = 1

type Input = Record<string, unknown>

function need<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) throw new Error(`missing ${what}`)
  return value
}

const ENGINES: Record<string, (input: Input) => unknown> = {
  'tarot.draw': (input) => drawSpread((input.spread as 'one' | 'three' | 'celtic') ?? 'three', {
    seed: input.seed as number | undefined,
    question: (input.question as string) ?? '',
  }),
  'tarot.spreads': () => SPREADS,

  'iching.cast': (input) => castHexagram({
    method: (input.method as 'coins' | 'yarrow') ?? 'coins',
    seed: input.seed as number | undefined,
    question: (input.question as string) ?? '',
  }),
  'iching.hexagram': (input) => hexagramByNumber(need(input.number as number, 'number')),

  'bazi.chart': (input) => computeBazi(input as unknown as Parameters<typeof computeBazi>[0]),

  'astrology.chart': (input) => computeChart(input as unknown as Parameters<typeof computeChart>[0]),
  'astrology.transits': (input) => {
    const chart = computeChart(need(input.birth, 'birth') as Parameters<typeof computeChart>[0])
    return transitsFor(chart, input.now ? new Date(input.now as string) : undefined)
  },

  'fengshui.mansions': (input) =>
    eightMansions(
      need(input.year as number, 'year'),
      need(input.month as number, 'month'),
      need(input.day as number, 'day'),
      (input.gender as 'male' | 'female') ?? 'female',
    ),
  'fengshui.sector': (input) => sectorForHeading(need(input.heading as number, 'heading')),

  'palm.features': (input) => palmFeatures(need(input.landmarks, 'landmarks') as Parameters<typeof palmFeatures>[0], need(input.lines, 'lines') as Parameters<typeof palmFeatures>[1]),
  'face.features': (input) => faceFeatures(need(input.landmarks, 'landmarks') as Parameters<typeof faceFeatures>[0]),

  'almanac.day': (input) => {
    const day = almanacFor(input.date ? new Date(`${input.date as string}T12:00:00`) : new Date())
    const activity = ACTIVITIES.find((item) => item.id === input.activity)
    return {
      ...day,
      luckyHours: luckyHours(day),
      judgement: activity ? { activity: activity.id, ...judgeActivity(day, activity) } : null,
    }
  },
  'almanac.activities': () => ACTIVITIES,

  'book.open': (input) => openBook((input.book as 'answers' | 'questions') ?? 'answers', {
    seed: input.seed as number | undefined,
    question: (input.question as string) ?? '',
  }),
}

export interface BridgeResult {
  ok: boolean
  version: number
  engine: string
  data?: unknown
  error?: string
}

/** Runs one engine. Never throws: a failure comes back as data, like a tool result. */
export function evaluate(engine: string, input: Input = {}): BridgeResult {
  const run = ENGINES[engine]
  if (!run) return { ok: false, version: BRIDGE_VERSION, engine, error: `unknown engine ${engine}` }
  try {
    return { ok: true, version: BRIDGE_VERSION, engine, data: run(input) }
  } catch (error) {
    return { ok: false, version: BRIDGE_VERSION, engine, error: error instanceof Error ? error.message : String(error) }
  }
}

/** The engines this bundle exposes, for a native app to discover at startup. */
export function engines(): string[] {
  return Object.keys(ENGINES).sort()
}

/** The same call from a native host, which finds it easier to pass one string. */
export function evaluateJson(request: string): string {
  try {
    const parsed = JSON.parse(request) as { engine?: string; input?: Input }
    return JSON.stringify(evaluate(parsed.engine ?? '', parsed.input ?? {}))
  } catch (error) {
    return JSON.stringify({ ok: false, version: BRIDGE_VERSION, engine: '', error: error instanceof Error ? error.message : String(error) })
  }
}

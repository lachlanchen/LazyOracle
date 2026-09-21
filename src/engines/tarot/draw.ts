import { DECK } from './deck'
import { SPREADS } from './spreads'
import type { DrawnCard, Spread, TarotDraw } from './types'

/**
 * Deterministic 32-bit PRNG (mulberry32). Given the same seed the same cards
 * come out in the same order with the same orientations, so a reading can be
 * reproduced from its seed and tested.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a hash of a string to a 32-bit seed. */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/** A fresh seed from the platform's entropy, falling back to time. */
export function randomSeed(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const buffer = new Uint32Array(1)
    crypto.getRandomValues(buffer)
    return buffer[0]
  }
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
}

/** Fisher–Yates shuffle driven by the seeded generator. */
export function shuffle<T>(items: readonly T[], next: () => number): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1))
    ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
  }
  return copy
}

export interface DrawOptions {
  seed?: number
  question?: string
  /** Probability that a card lands reversed; the traditional practice is about a third. */
  reversalRate?: number
  now?: Date
}

/** Draws a spread from a full shuffle: no card appears twice. */
export function drawSpread(spreadId: Spread['id'], options: DrawOptions = {}): TarotDraw {
  const spread = SPREADS[spreadId]
  const seed = options.seed ?? randomSeed()
  const next = mulberry32(seed)
  const shuffled = shuffle(DECK, next)
  const reversalRate = options.reversalRate ?? 0.33
  const cards: DrawnCard[] = spread.positions.map((position, index) => ({
    position,
    card: shuffled[index],
    orientation: next() < reversalRate ? 'reversed' : 'upright',
  }))
  return {
    spread,
    seed,
    cards,
    question: (options.question ?? '').trim(),
    drawnAt: (options.now ?? new Date()).toISOString(),
  }
}

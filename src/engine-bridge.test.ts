import { describe, expect, it } from 'vitest'
import { BRIDGE_VERSION, engines, evaluate, evaluateJson } from './engine-bridge'
import { almanacFor } from './engines/almanac/almanac'
import { castHexagram } from './engines/iching/cast'
import { drawSpread } from './engines/tarot/draw'

describe('the engine bridge', () => {
  it('exposes every practice the app has', () => {
    expect(engines()).toEqual([
      'almanac.activities',
      'almanac.day',
      'astrology.chart',
      'astrology.transits',
      'bazi.chart',
      'book.open',
      'face.features',
      'fengshui.mansions',
      'fengshui.sector',
      'iching.cast',
      'iching.hexagram',
      'palm.features',
      'tarot.draw',
      'tarot.spreads',
    ])
  })

  it('gives a native caller exactly what the app computes, for the same seed', () => {
    const throughBridge = evaluate('tarot.draw', { spread: 'three', seed: 4242, question: 'work' })
    const direct = drawSpread('three', { seed: 4242, question: 'work' })
    expect(throughBridge.ok).toBe(true)
    expect((throughBridge.data as typeof direct).cards.map((card) => card.card.id)).toEqual(direct.cards.map((card) => card.card.id))

    const cast = evaluate('iching.cast', { seed: 99 })
    expect((cast.data as ReturnType<typeof castHexagram>).primary.number).toBe(castHexagram({ seed: 99 }).primary.number)

    const day = evaluate('almanac.day', { date: '2026-09-23', activity: 'marry' })
    const expected = almanacFor(new Date('2026-09-23T12:00:00'))
    expect((day.data as { yi: string[] }).yi).toEqual(expected.yi)
    expect((day.data as { judgement: { verdict: string } }).judgement.verdict).toBe('avoid')
  })

  it('returns a failure as data rather than throwing', () => {
    expect(evaluate('nope')).toMatchObject({ ok: false, error: 'unknown engine nope' })
    expect(evaluate('iching.hexagram', {})).toMatchObject({ ok: false })
    expect(evaluate('palm.features', { landmarks: [], lines: {} })).toMatchObject({ ok: false })
  })

  it('answers a native host in one JSON string, version stamped', () => {
    const reply = JSON.parse(evaluateJson(JSON.stringify({ engine: 'fengshui.mansions', input: { year: 1990, month: 6, day: 15, gender: 'female' } })))
    expect(reply.ok).toBe(true)
    expect(reply.version).toBe(BRIDGE_VERSION)
    expect(reply.data.gua).toBeTruthy()
    expect(JSON.parse(evaluateJson('not json')).ok).toBe(false)
  })
})

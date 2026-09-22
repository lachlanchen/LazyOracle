import { describe, expect, it } from 'vitest'
import { ACTIVITIES, almanacFor, judgeActivity, luckyHours, STANDING_TEXT } from './almanac'

const day = almanacFor(new Date(2026, 8, 23)) // 23 September 2026

describe('the almanac page', () => {
  it('reads the traditional tables for a date', () => {
    expect(day.date).toBe('2026-09-23')
    expect(day.lunar.dayGanZhi).toHaveLength(2)
    expect(day.lunar.yearGanZhi).toHaveLength(2)
    expect(day.lunar.zodiac).toHaveLength(1)
    expect(day.dayOfficer).toHaveLength(1)
    expect(day.mansion.name).toHaveLength(1)
    expect(['黄道', '黑道']).toContain(day.spirit.road)
    expect(day.pengzu).toHaveLength(2)
  })

  it('gives twelve double hours, each with its range and spirit', () => {
    expect(day.hours.length).toBeGreaterThanOrEqual(12)
    for (const hour of day.hours.slice(0, 12)) {
      expect(hour.ganzhi).toHaveLength(2)
      expect(hour.range).toMatch(/^\d{2}:\d{2}–\d{2}:\d{2}$/)
      expect(typeof hour.lucky).toBe('boolean')
    }
    expect(luckyHours(day).length).toBeGreaterThan(0)
  })

  it('is a lookup, so the same date always gives the same page', () => {
    const again = almanacFor(new Date(2026, 8, 23))
    expect(again).toEqual(day)
  })

  it('names the standing of the day from its spirit and officer', () => {
    expect(Object.keys(STANDING_TEXT)).toContain(day.standing)
  })
})

describe('asking whether a day suits an undertaking', () => {
  it("answers from the almanac's own words, and says which word decided it", () => {
    const marry = ACTIVITIES.find((a) => a.id === 'marry')!
    const judgement = judgeActivity(day, marry)
    // 23 September 2026 lists 嫁娶 among the things to avoid.
    expect(judgement.verdict).toBe('avoid')
    expect(judgement.matched).toContain('嫁娶')
    expect(judgement.basis.en).toContain('avoid')
  })

  it('reports a suitable undertaking with the word that supports it', () => {
    const ritual = ACTIVITIES.find((a) => a.id === 'ritual')!
    const judgement = judgeActivity(day, ritual)
    expect(judgement.verdict).toBe('suitable')
    expect(judgement.matched).toBe('祭祀')
  })

  it('admits when the almanac simply does not name the undertaking', () => {
    const invented = { id: 'x', name: { zh: '放风筝', en: 'Fly a kite' }, terms: ['放风筝'] }
    const judgement = judgeActivity({ ...day, yi: ['祭祀'], ji: ['嫁娶'] }, invented)
    expect(judgement.verdict).toBe('neutral')
    expect(judgement.matched).toBeNull()
    expect(judgement.basis.en).toContain('does not name')
  })

  it("covers the undertakings people look up, each with the almanac's vocabulary", () => {
    expect(ACTIVITIES.length).toBeGreaterThanOrEqual(10)
    for (const activity of ACTIVITIES) {
      expect(activity.terms.length).toBeGreaterThan(0)
      expect(activity.name.zh.length).toBeGreaterThan(1)
      expect(activity.name.en.length).toBeGreaterThan(2)
    }
  })
})

import { describe, expect, it } from 'vitest'
import { computeBazi, equationOfTimeMinutes, tenGod, trueSolarOffsetMinutes } from './bazi'

describe('four pillars', () => {
  it('matches published pillars for a known birth moment', () => {
    // 1990-06-15 10:30 Beijing time: 庚午 壬午 辛亥 癸巳, day master 辛 (yin metal).
    const chart = computeBazi({ year: 1990, month: 6, day: 15, hour: 10, minute: 30, gender: 'male' }, new Date('2026-09-21'))
    expect([chart.pillars.year.ganzhi, chart.pillars.month.ganzhi, chart.pillars.day.ganzhi, chart.pillars.hour.ganzhi]).toEqual(['庚午', '壬午', '辛亥', '癸巳'])
    expect(chart.dayMaster).toEqual({ stem: '辛', element: '金', yinYang: '阴' })
    expect(chart.pillars.year.stemGod).toBe('劫财')
    expect(chart.pillars.month.hiddenStems.map((h) => h.stem)).toEqual(['丁', '己'])
    expect(chart.pillars.day.naYin).toBe('钗钏金')
    expect(chart.luckStart).toEqual({ years: 7, months: 5 })
    expect(chart.luckCycles[0]).toMatchObject({ ganzhi: '癸未', startYear: 1997 })
    expect(chart.luckCycles[1].ganzhi).toBe('甲申')
    expect(Object.values(chart.elements).reduce((a, b) => a + b, 0)).toBe(8)
    expect(chart.currentYear.year).toBe(2026)
    expect(chart.currentYear.ganzhi).toBe('丙午')
  })

  it('respects the 立春 boundary for the year pillar and the 节 boundary for the month', () => {
    // 2024-02-03 is before 立春 (Feb 4, 2024): still 癸卯 year, 乙丑 month.
    const before = computeBazi({ year: 2024, month: 2, day: 3, hour: 12, minute: 0, gender: 'female' })
    const after = computeBazi({ year: 2024, month: 2, day: 5, hour: 12, minute: 0, gender: 'female' })
    expect(before.pillars.year.ganzhi).toBe('癸卯')
    expect(before.pillars.month.ganzhi).toBe('乙丑')
    expect(after.pillars.year.ganzhi).toBe('甲辰')
    expect(after.pillars.month.ganzhi).toBe('丙寅')
  })

  it('applies true solar time from longitude and the equation of time', () => {
    expect(Math.abs(equationOfTimeMinutes(45))).toBeLessThan(16)
    // Urumqi (87.6°E) on China standard time runs about two hours behind the meridian.
    const offset = trueSolarOffsetMinutes(87.6, 8, 172)
    expect(offset).toBeLessThan(-120)
    expect(offset).toBeGreaterThan(-135)
    // 23:30 civil time in Urumqi is 21:25 solar time: the 亥 hour, not the 子 hour of the next day.
    const uncorrected = computeBazi({ year: 1990, month: 6, day: 15, hour: 23, minute: 30, gender: 'male' })
    const chart = computeBazi({ year: 1990, month: 6, day: 15, hour: 23, minute: 30, gender: 'male', longitude: 87.6, utcOffsetHours: 8 })
    expect(uncorrected.pillars.hour.branch).toBe('子')
    expect(chart.solarCorrectionMinutes).toBeLessThan(-100)
    expect(chart.pillars.hour.branch).toBe('亥')
  })

  it('names the ten gods relative to the day master', () => {
    expect(tenGod('辛', '庚')).toBe('劫财')
    expect(tenGod('辛', '辛')).toBe('比肩')
    expect(tenGod('甲', '丙')).toBe('食神')
    expect(tenGod('甲', '丁')).toBe('伤官')
    expect(tenGod('甲', '戊')).toBe('偏财')
    expect(tenGod('甲', '庚')).toBe('七杀')
    expect(tenGod('甲', '癸')).toBe('正印')
  })
})

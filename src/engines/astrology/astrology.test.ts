import { describe, expect, it } from 'vitest'
import { ascendantFor, computeChart, SIGNS, transitsFor } from './astrology'

describe('natal chart', () => {
  it('puts the Sun at the equinox point and the Moon in the right sign on reference dates', () => {
    // 2024-03-20 03:06 UTC vernal equinox: Sun at 0° Aries.
    const equinox = computeChart({ year: 2024, month: 3, day: 20, hour: 3, minute: 6, utcOffsetHours: 0, latitude: 51.5, longitude: 0 })
    const sun = equinox.placements.find((p) => p.body === 'Sun')!
    expect(Math.min(sun.longitude, 360 - sun.longitude)).toBeLessThan(0.05)
    expect(SIGNS[sun.sign].en === 'Aries' || SIGNS[sun.sign].en === 'Pisces').toBe(true)
    // 2000-01-01 12:00 UTC: Sun ~280.4° (Capricorn), Moon ~ 217° (Scorpio), Jupiter ~ 25° Aries.
    const j2000 = computeChart({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, utcOffsetHours: 0, latitude: 0, longitude: 0 })
    const by = Object.fromEntries(j2000.placements.map((p) => [p.body, p]))
    expect(by.Sun.longitude).toBeCloseTo(280.4, 0)
    expect(SIGNS[by.Sun.sign].en).toBe('Capricorn')
    expect(SIGNS[by.Moon.sign].en).toBe('Scorpio')
    expect(SIGNS[by.Jupiter.sign].en).toBe('Aries')
    expect(SIGNS[by.Saturn.sign].en).toBe('Taurus')
    expect(by.Pluto.longitude).toBeCloseTo(251.4, 0)
  })

  it('computes an ascendant that advances through the zodiac over a day', () => {
    const base = { latitude: 31.2, longitude: 121.5 }
    const a = ascendantFor(new Date('2024-06-21T00:00:00Z'), base.latitude, base.longitude)
    const b = ascendantFor(new Date('2024-06-21T02:00:00Z'), base.latitude, base.longitude)
    const delta = ((b.ascendant - a.ascendant + 360) % 360)
    expect(delta).toBeGreaterThan(15)
    expect(delta).toBeLessThan(60)
    // The Midheaven is roughly 90° behind the Ascendant.
    const gap = ((a.ascendant - a.midheaven + 360) % 360)
    expect(gap).toBeGreaterThan(60)
    expect(gap).toBeLessThan(120)
  })

  it('assigns whole-sign houses and finds aspects and transits', () => {
    const chart = computeChart({ year: 1990, month: 6, day: 15, hour: 10, minute: 30, utcOffsetHours: 8, latitude: 39.9, longitude: 116.4 })
    for (const p of chart.placements) {
      expect(p.house).toBe(((p.sign - chart.ascendantSign + 12) % 12) + 1)
      expect(p.degree).toBeGreaterThanOrEqual(0)
      expect(p.degree).toBeLessThan(30)
    }
    expect(chart.aspects.length).toBeGreaterThan(3)
    const today = transitsFor(chart, new Date('2026-09-21T00:00:00Z'))
    expect(today.positions).toHaveLength(10)
    for (const t of today.transits) expect(t.orb).toBeLessThanOrEqual(3)
  })
})

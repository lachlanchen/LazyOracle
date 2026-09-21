import { describe, expect, it } from 'vitest'
import { eightMansions, guaNumber, sectorForHeading } from './fengshui'

describe('eight mansions', () => {
  it('computes the personal trigram with the standard formula', () => {
    // 1990 → 1+9+9+0 = 19 → 10 → 1; male 11-1 = 10 → 1 坎; female 1+4 = 5 → 8 艮.
    expect(guaNumber(1990, 'male')).toBe(1)
    expect(guaNumber(1990, 'female')).toBe(8)
    // 1985 → 23 → 5; male 11-5 = 6 乾; female 5+4 = 9 离.
    expect(guaNumber(1985, 'male')).toBe(6)
    expect(guaNumber(1985, 'female')).toBe(9)
    // 2005 → 7; male 10-7 = 3 震; female 7+6 = 13 → 4 巽.
    expect(guaNumber(2005, 'male')).toBe(3)
    expect(guaNumber(2005, 'female')).toBe(4)
  })

  it('uses the 立春 year and lists eight sectors with four good and four bad', () => {
    const m = eightMansions(1990, 1, 20, 'male') // before 立春: counts as 1989 → 27 → 9 → 11-9 = 2 坤
    expect(m.year).toBe(1989)
    expect(m.gua).toBe('坤')
    expect(m.group).toBe('west')
    expect(m.sectors).toHaveLength(8)
    expect(m.sectors.filter((s) => s.quality.auspicious)).toHaveLength(4)
    expect(m.best).toBe('NE')
    expect(m.worst).toBe('N')
    const kan = eightMansions(1990, 6, 15, 'male')
    expect(kan.gua).toBe('坎')
    expect(kan.best).toBe('SE')
    expect(kan.worst).toBe('SW')
  })

  it('maps headings to sectors', () => {
    expect(sectorForHeading(0)).toBe('N')
    expect(sectorForHeading(44)).toBe('NE')
    expect(sectorForHeading(359)).toBe('N')
    expect(sectorForHeading(-90)).toBe('W')
    expect(sectorForHeading(200)).toBe('S')
  })
})

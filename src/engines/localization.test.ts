import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DECK } from './tarot/deck'
import { SPREADS } from './tarot/spreads'
import { HEXAGRAMS, TRIGRAMS } from './iching/data'
import { answerBook, questionBook } from './answers/answers'
import { QUALITIES, DIRECTION_TEXT } from './fengshui/fengshui'
import { ACTIVITIES, almanacFor } from './almanac/almanac'

const catalogue = JSON.parse(readFileSync('i18n/app/content.json', 'utf8')) as Record<string, Record<string, string>>
const languages = ['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko', 'vi', 'es', 'fr', 'de', 'ru', 'ar']
const translated = (source: string) => expect(catalogue, `Missing translation: ${source}`).toHaveProperty(source)
function bilingual(value: unknown) {
  if (!value || typeof value !== 'object') return
  const row = value as Record<string, unknown>
  if (typeof row.en === 'string' && typeof row.zh === 'string') translated(row.en)
  else if (Array.isArray(row.en) && Array.isArray(row.zh)) translated(row.en.join(' · '))
  Object.values(row).forEach(bilingual)
}

describe('native selected-language reading catalogue', () => {
  it('has every language, preserves placeholders and avoids bilingual output', () => {
    for (const [source, row] of Object.entries(catalogue)) {
      expect(Object.keys(row).sort(), source).toEqual([...languages].sort())
      for (const [code, value] of Object.entries(row)) {
        expect(value.trim(), `${source}:${code}`).not.toBe('')
        expect(value.match(/\{\d+\}/g)?.sort() ?? [], `${source}:${code}`).toEqual(source.match(/\{\d+\}/g)?.sort() ?? [])
        if (!['zh-Hans', 'zh-Hant', 'ja'].includes(code)) expect(value, `${source}:${code}`).not.toMatch(/[\u3400-\u9fff]/)
      }
    }
  })
  it('covers all cards, spreads, hexagrams, books, sectors and activities', () => {
    bilingual([SPREADS, HEXAGRAMS, TRIGRAMS, answerBook, questionBook, QUALITIES, DIRECTION_TEXT, ACTIVITIES])
    for (const card of DECK) {
      translated(card.text.en.name)
      translated(card.text.en.upright.join(' · '))
      translated(card.text.en.reversed.join(' · '))
    }
    HEXAGRAMS.forEach(hexagram => translated(hexagram.judgement))
    Object.values(TRIGRAMS).forEach(trigram => translated(trigram.name.zh))
  })
  it('covers the almanac vocabulary across the coming calendar year', () => {
    for (let offset = 0; offset < 400; offset++) {
      const day = almanacFor(new Date(2026, 0, offset + 1))
      const terms = [day.dayOfficer, day.spirit.name, day.spirit.road, day.spirit.luck, day.clash,
        day.harmDirection, ...day.auspicious, ...day.inauspicious, ...day.pengzu, ...day.yi, ...day.ji,
        day.mansion.name, day.mansion.animal, day.mansion.direction, day.mansion.beast,
        day.lunar.yearGanZhi, day.lunar.monthGanZhi, day.lunar.dayGanZhi, day.lunar.zodiac,
        ...day.hours.flatMap(hour => [hour.ganzhi, hour.spirit])]
      terms.filter(Boolean).forEach(translated)
    }
  })
})

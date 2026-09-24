import { readingTerm, lunarDateText } from '../lib/reading-localisation'
import { almanacFor } from '../engines/almanac/almanac'
import type { UICopy } from '../i18n'
import type { ReadingLanguage } from '../types'

interface TodayStripProps {
  copy: UICopy
  language: ReadingLanguage
  onOpen: () => void
}

/**
 * Today's almanac in one line, on the home screen.
 *
 * It is the one thing worth seeing every day without asking for it: what the
 * day is held to suit and to avoid, taken straight from the tables. Tapping
 * it opens the full page.
 */
export function TodayStrip({ copy, language, onOpen }: TodayStripProps) {
  const day = almanacFor(new Date())
  const t = copy.almanac
  const l = language === 'en' ? 'en' : 'zh'
  const join = (items: string[]) => items.slice(0, 3).map(value => readingTerm(value, language)).join(l === 'en' ? ' · ' : '　') || t.nothingListed

  return (
    <button type="button" className="today-strip" onClick={onOpen} data-testid="today-strip">
      <span className="today-date">
        {lunarDateText(day.lunar.text, language)} · {readingTerm(day.lunar.dayGanZhi, language)}
        {day.solarTerm ? ` · ${readingTerm(day.solarTerm, language)}` : ''}
      </span>
      <span className="today-line">
        <b className="almanac-yi">{t.suitable}</b> {join(day.yi)}
      </span>
      <span className="today-line">
        <b className="almanac-ji">{t.avoid}</b> {join(day.ji)}
      </span>
    </button>
  )
}

import catalogue from '../generated/reading-content.json'
import type { ReadingLanguage } from '../types'
const terms: Record<string, Record<string, string>> = catalogue
/** Display translations never alter the facts passed to engines or narration. */
export function readingTerm(source: string, language: ReadingLanguage): string {
  return terms[source]?.[language] ?? source
}
export function lunarDateText(source: string, language: ReadingLanguage): string {
  if (language !== 'en') return source
  const digits: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 正: 1, 冬: 11, 腊: 12 }
  const number = (value: string) => {
    const text = value.replace('初', '').replace('廿', '二十').replace('卅', '三十')
    if (text.includes('十')) { const [a, b] = text.split('十'); return (digits[a] ?? 1) * 10 + (digits[b] ?? 0) }
    return digits[text] ?? text
  }
  const parts = source.replace('闰', '').split(/[月日]/).filter(Boolean)
  return parts.length === 2 ? `Lunar ${number(parts[0])}/${number(parts[1])}${source.includes('闰') ? ' (leap month)' : ''}` : source
}

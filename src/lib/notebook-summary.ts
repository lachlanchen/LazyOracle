import { SIGNS } from '../engines/astrology/astrology'
import { DIRECTION_TEXT, GUA_EN, type Direction, type GuaName } from '../engines/fengshui/fengshui'
import type { TarotDraw } from '../engines/tarot/types'
import type { IChingCast } from '../engines/iching/cast'
import type { exploreHexagram } from '../engines/iching/explore'

/** Display-only excerpts of an existing result. Never calls or reruns an engine. */
export function notebookSummary(practice: string, result: Record<string, unknown>) {
  const lines: string[][] = []
  const add = (...parts: unknown[]) => {
    const row = parts.filter((v) => typeof v === 'string' || typeof v === 'number').map(String).filter(Boolean)
    if (row.length) lines.push(row)
  }
  if (practice === 'tarot') {
    const draw = result as unknown as TarotDraw
    for (const item of draw.cards) add(item.position.name.en, item.card.text.en.name, item.orientation === 'reversed' ? 'REVERSED' : 'Upright')
  } else if (practice === 'iching' || practice === 'atlas') {
    const reading = result as unknown as IChingCast | ReturnType<typeof exploreHexagram>
    add(reading.primary.number, reading.primary.name.en)
    if (reading.resulting) add('→', reading.resulting.number, reading.resulting.name.en)
    add('Moving lines', reading.changingPositions.join(', ') || '—')
    add(reading.primary.sense.en)
  } else if (practice === 'answers') {
    const page = result.page as { number: number; en: string }
    add(page.number, page.en)
  } else if (practice === 'bazi') {
    const pillars = result.pillars as Record<string, { ganzhi: string }>
    for (const key of ['year', 'month', 'day', 'hour']) add(key[0].toUpperCase() + key.slice(1), pillars[key].ganzhi)
  } else if (practice === 'astrology') {
    for (const item of result.placements as { body: string; degree: number; sign: number }[]) {
      add(item.body, SIGNS[item.sign]?.en, `${item.degree.toFixed(1)}°`)
    }
  } else if (practice === 'almanac') {
    add(result.date, (result.lunar as { text: string }).text)
    add('Suits', ...(result.yi as string[]))
    add('Avoid', ...(result.ji as string[]))
  } else if (practice === 'fengshui') {
    add('Your gua', result.guaNumber, GUA_EN[result.gua as GuaName], result.group === 'east' ? 'East group' : 'West group')
    for (const sector of result.sectors as { direction: string; quality: { name: { en: string } } }[]) add(DIRECTION_TEXT[sector.direction as Direction]?.en, sector.quality.name.en)
  } else if (practice === 'face' || practice === 'palm') {
    const type = String(practice === 'face' ? result.element : result.shape)
    add(type[0].toUpperCase() + type.slice(1))
    const metrics = practice === 'face' ? ['heightRatio', 'jawRatio', 'foreheadRatio'] : ['palmRatio', 'fingerRatio', 'indexToRing']
    const labels: Record<string, string> = { heightRatio: 'Height to width', jawRatio: 'Jaw to cheekbones', foreheadRatio: 'Forehead to cheekbones', palmRatio: 'Palm width to length', fingerRatio: 'Fingers to palm', indexToRing: 'Index to ring' }
    for (const key of metrics) if (typeof result[key] === 'number') add(labels[key], (result[key] as number).toFixed(3))
  } else throw new Error('unknown notebook practice')
  return { question: typeof result.question === 'string' ? result.question : '', lines }
}

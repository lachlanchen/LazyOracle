import { Solar } from 'lunar-typescript'

/**
 * Four Pillars (四柱八字) from a birth moment. Calendar conversion, solar
 * terms, sexagenary pillars, hidden stems, ten gods and luck cycles come from
 * lunar-typescript (6tail's lunar library), a mature deterministic
 * implementation; this module only adds true solar time and a structured
 * summary the visual and the model can use.
 */

export type Gender = 'male' | 'female'

export interface BirthInput {
  /** Local civil date and time of birth. */
  year: number
  month: number
  day: number
  hour: number
  minute: number
  gender: Gender
  /** Longitude in degrees east; used with `utcOffsetHours` for true solar time. */
  longitude?: number
  /** Time-zone offset of the civil time (e.g. 8 for China). */
  utcOffsetHours?: number
}

export interface Pillar {
  stem: string
  branch: string
  ganzhi: string
  /** Ten-god relation of the stem to the day master (day pillar: 日主). */
  stemGod: string
  /** Hidden stems in the branch with their ten gods, main first. */
  hiddenStems: { stem: string; god: string }[]
  naYin: string
  element: string
}

export interface LuckCycle {
  ganzhi: string
  startYear: number
  endYear: number
  startAge: number
}

export interface BaziChart {
  input: BirthInput
  /** Civil time actually used after the true-solar-time correction, minutes offset applied. */
  solarCorrectionMinutes: number
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar }
  dayMaster: { stem: string; element: string; yinYang: '阳' | '阴' }
  elements: Record<'木' | '火' | '土' | '金' | '水', number>
  strength: 'strong' | 'balanced' | 'weak'
  favourable: string[]
  lunar: { text: string; jieQiBefore: string; jieQiAfter: string }
  luckCycles: LuckCycle[]
  luckStart: { years: number; months: number }
  currentYear: { year: number; ganzhi: string; god: string }
}

const STEM_ELEMENT: Record<string, string> = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' }
const BRANCH_ELEMENT: Record<string, string> = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' }
const YANG_STEMS = new Set(['甲', '丙', '戊', '庚', '壬'])
const GENERATES: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const GENERATED_BY: Record<string, string> = { 火: '木', 土: '火', 金: '土', 水: '金', 木: '水' }

/** Equation of time in minutes for a given day of year (Spencer 1971, accurate to about a minute). */
export function equationOfTimeMinutes(dayOfYear: number): number {
  const b = (2 * Math.PI * (dayOfYear - 1)) / 365
  return 229.18 * (0.000075 + 0.001868 * Math.cos(b) - 0.032077 * Math.sin(b) - 0.014615 * Math.cos(2 * b) - 0.04089 * Math.sin(2 * b))
}

/** Minutes to add to civil time to get true solar time at the given longitude. */
export function trueSolarOffsetMinutes(longitude: number, utcOffsetHours: number, dayOfYear: number): number {
  const meridian = utcOffsetHours * 15
  return (longitude - meridian) * 4 + equationOfTimeMinutes(dayOfYear)
}

function dayOfYear(year: number, month: number, day: number): number {
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000) + 1
}

export function computeBazi(input: BirthInput, now: Date = new Date()): BaziChart {
  let correction = 0
  if (typeof input.longitude === 'number' && typeof input.utcOffsetHours === 'number') {
    correction = Math.round(trueSolarOffsetMinutes(input.longitude, input.utcOffsetHours, dayOfYear(input.year, input.month, input.day)))
  }
  const civil = new Date(Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute))
  const corrected = new Date(civil.getTime() + correction * 60000)
  const solar = Solar.fromYmdHms(
    corrected.getUTCFullYear(),
    corrected.getUTCMonth() + 1,
    corrected.getUTCDate(),
    corrected.getUTCHours(),
    corrected.getUTCMinutes(),
    0,
  )
  const lunar = solar.getLunar()
  const chart = lunar.getEightChar()
  chart.setSect(2)

  const pillar = (stem: string, branch: string, god: string, hidden: string[], hiddenGods: string[], naYin: string): Pillar => ({
    stem,
    branch,
    ganzhi: stem + branch,
    stemGod: god,
    hiddenStems: hidden.map((item, index) => ({ stem: item, god: hiddenGods[index] })),
    naYin,
    element: STEM_ELEMENT[stem],
  })

  const pillars = {
    year: pillar(chart.getYearGan(), chart.getYearZhi(), chart.getYearShiShenGan(), chart.getYearHideGan(), chart.getYearShiShenZhi(), chart.getYearNaYin()),
    month: pillar(chart.getMonthGan(), chart.getMonthZhi(), chart.getMonthShiShenGan(), chart.getMonthHideGan(), chart.getMonthShiShenZhi(), chart.getMonthNaYin()),
    day: pillar(chart.getDayGan(), chart.getDayZhi(), '日主', chart.getDayHideGan(), chart.getDayShiShenZhi(), chart.getDayNaYin()),
    hour: pillar(chart.getTimeGan(), chart.getTimeZhi(), chart.getTimeShiShenGan(), chart.getTimeHideGan(), chart.getTimeShiShenZhi(), chart.getTimeNaYin()),
  }

  const elements: BaziChart['elements'] = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  for (const p of Object.values(pillars)) {
    elements[STEM_ELEMENT[p.stem] as keyof typeof elements] += 1
    elements[BRANCH_ELEMENT[p.branch] as keyof typeof elements] += 1
  }

  const dayElement = STEM_ELEMENT[pillars.day.stem]
  // A simple, transparent strength heuristic: the day master's own element
  // and the element that generates it support it; the month branch counts
  // double because the season governs strength.
  const support = elements[dayElement as keyof typeof elements] + elements[GENERATED_BY[dayElement] as keyof typeof elements]
  const monthElement = BRANCH_ELEMENT[pillars.month.branch]
  const seasonal = monthElement === dayElement || monthElement === GENERATED_BY[dayElement] ? 1 : 0
  const score = support + seasonal
  const strength: BaziChart['strength'] = score >= 5 ? 'strong' : score <= 2 ? 'weak' : 'balanced'
  const favourable =
    strength === 'strong'
      ? [GENERATES[dayElement], GENERATES[GENERATES[dayElement]]]
      : strength === 'weak'
        ? [dayElement, GENERATED_BY[dayElement]]
        : [GENERATES[dayElement], GENERATED_BY[dayElement]]

  const yun = chart.getYun(input.gender === 'male' ? 1 : 0)
  const luckCycles: LuckCycle[] = yun
    .getDaYun()
    .slice(1, 9)
    .map((cycle) => ({ ganzhi: cycle.getGanZhi(), startYear: cycle.getStartYear(), endYear: cycle.getEndYear(), startAge: cycle.getStartAge() }))

  const currentYear = now.getFullYear()
  const thisYear = Solar.fromYmd(currentYear, 6, 1).getLunar().getEightChar()
  return {
    input,
    solarCorrectionMinutes: correction,
    pillars,
    dayMaster: { stem: pillars.day.stem, element: dayElement, yinYang: YANG_STEMS.has(pillars.day.stem) ? '阳' : '阴' },
    elements,
    strength,
    favourable,
    lunar: { text: lunar.toString(), jieQiBefore: lunar.getPrevJieQi(true).getName(), jieQiAfter: lunar.getNextJieQi(true).getName() },
    luckCycles,
    luckStart: { years: yun.getStartYear(), months: yun.getStartMonth() },
    currentYear: { year: currentYear, ganzhi: thisYear.getYear(), god: tenGod(pillars.day.stem, thisYear.getYearGan()) },
  }
}

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const TEN_GODS = ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印']

/** Ten-god relation of `other` to the day master `dayStem`. */
export function tenGod(dayStem: string, other: string): string {
  const me = STEMS.indexOf(dayStem)
  const it = STEMS.indexOf(other)
  if (me < 0 || it < 0) return ''
  const myElement = Math.floor(me / 2)
  const itsElement = Math.floor(it / 2)
  const samePolarity = me % 2 === it % 2
  const relation = (itsElement - myElement + 5) % 5 // 0 same, 1 I generate, 2 I control, 3 controls me, 4 generates me
  return TEN_GODS[relation * 2 + (samePolarity ? 0 : 1)]
}

export const ELEMENT_EN: Record<string, string> = { 木: 'Wood', 火: 'Fire', 土: 'Earth', 金: 'Metal', 水: 'Water' }
export const TEN_GOD_EN: Record<string, string> = {
  比肩: 'Friend', 劫财: 'Rob Wealth', 食神: 'Eating God', 伤官: 'Hurting Officer', 偏财: 'Indirect Wealth', 正财: 'Direct Wealth',
  七杀: 'Seven Killings', 正官: 'Direct Officer', 偏印: 'Indirect Resource', 正印: 'Direct Resource', 日主: 'Day Master',
}

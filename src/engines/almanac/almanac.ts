/**
 * The almanac (黄历 / 通书): what a day is held to suit and to avoid.
 *
 * Every field here comes from `lunar-typescript`, which implements the
 * traditional almanac tables directly: the sexagenary stems and branches, the
 * twelve day officers (建除十二神), the twenty-eight lunar mansions (二十八宿),
 * the yellow and black road spirits (黄道黑道十二神), the auspicious and
 * inauspicious spirits of the day (吉神宜趋 / 凶神宜忌), Peng Zu's hundred
 * taboos (彭祖百忌), and the 宜 and 忌 lists those tables produce.
 *
 * Nothing is invented and nothing is random: the same date always gives the
 * same page, because it is a lookup, not a judgement. What this module adds is
 * a way to ask one practical question — is this day held to suit a particular
 * undertaking — and an honest answer when the almanac simply does not say.
 */
import { Solar } from 'lunar-typescript'

export interface AlmanacHour {
  /** Stem and branch of the double hour, e.g. 丙子. */
  ganzhi: string
  /** The clock range it covers, e.g. 23:00–01:00. */
  range: string
  /** The spirit governing it. */
  spirit: string
  lucky: boolean
}

export interface AlmanacDay {
  /** ISO date, the day this page describes. */
  date: string
  lunar: {
    text: string
    yearGanZhi: string
    monthGanZhi: string
    dayGanZhi: string
    zodiac: string
  }
  /** The solar term falling on this day, if any, and the next one. */
  solarTerm: string | null
  nextSolarTerm: { name: string; date: string }
  /** What the almanac holds the day to suit, and to avoid. */
  yi: string[]
  ji: string[]
  /** The branch this day clashes with, and the direction of its harm. */
  clash: string
  harmDirection: string
  /** 建除十二神: the day officer. */
  dayOfficer: string
  /** 二十八宿 with its animal, direction and quadrant beast. */
  mansion: { name: string; animal: string; direction: string; beast: string }
  /** 黄道黑道十二神: the spirit of the day and whether its road is yellow. */
  spirit: { name: string; road: string; luck: string }
  auspicious: string[]
  inauspicious: string[]
  /** 彭祖百忌 for the day's stem and branch. */
  pengzu: string[]
  hours: AlmanacHour[]
  /** Overall colour of the day, from the spirit's road and the officer. */
  standing: 'auspicious' | 'mixed' | 'inauspicious'
}

/** Day officers traditionally counted as favourable, and as not. */
const GOOD_OFFICERS = new Set(['除', '危', '定', '执', '成', '开'])
const BAD_OFFICERS = new Set(['建', '满', '平', '破', '收', '闭'])

const HOUR_RANGES = ['23:00–01:00', '01:00–03:00', '03:00–05:00', '05:00–07:00', '07:00–09:00', '09:00–11:00', '11:00–13:00', '13:00–15:00', '15:00–17:00', '17:00–19:00', '19:00–21:00', '21:00–23:00', '23:00–00:00']

export function almanacFor(date: Date): AlmanacDay {
  const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())
  const lunar = solar.getLunar()
  const next = lunar.getNextJieQi()
  const officer = lunar.getZhiXing()
  const road = lunar.getDayTianShenType()

  const hours: AlmanacHour[] = lunar.getTimes().map((time, index) => ({
    ganzhi: time.getGanZhi(),
    range: HOUR_RANGES[index] ?? '',
    spirit: time.getTianShen(),
    lucky: time.getTianShenLuck() === '吉',
  }))

  const standing: AlmanacDay['standing'] =
    road === '黄道' && GOOD_OFFICERS.has(officer) ? 'auspicious' : road === '黑道' && BAD_OFFICERS.has(officer) ? 'inauspicious' : 'mixed'

  return {
    date: `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`,
    lunar: {
      text: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
      yearGanZhi: lunar.getYearInGanZhi(),
      monthGanZhi: lunar.getMonthInGanZhi(),
      dayGanZhi: lunar.getDayInGanZhi(),
      zodiac: lunar.getYearShengXiao(),
    },
    solarTerm: lunar.getJieQi() || null,
    nextSolarTerm: { name: next.getName(), date: next.getSolar().toYmd() },
    yi: lunar.getDayYi(),
    ji: lunar.getDayJi(),
    clash: lunar.getDayChongDesc(),
    harmDirection: lunar.getDaySha(),
    dayOfficer: officer,
    mansion: { name: lunar.getXiu(), animal: lunar.getAnimal(), direction: lunar.getZheng(), beast: lunar.getShou() },
    spirit: { name: lunar.getDayTianShen(), road, luck: lunar.getDayTianShenLuck() },
    auspicious: lunar.getDayJiShen(),
    inauspicious: lunar.getDayXiongSha(),
    pengzu: [lunar.getPengZuGan(), lunar.getPengZuZhi()],
    hours,
    standing,
  }
}

export type Verdict = 'suitable' | 'avoid' | 'neutral'

export interface Activity {
  id: string
  name: { zh: string; en: string }
  /**
   * The almanac's own words for this undertaking. A day suits the activity
   * when one of these appears in its 宜 list, and is to be avoided when one
   * appears in its 忌 list.
   */
  terms: string[]
}

/** The undertakings people actually look up, in the almanac's own vocabulary. */
export const ACTIVITIES: Activity[] = [
  { id: 'marry', name: { zh: '嫁娶', en: 'Marry' }, terms: ['嫁娶', '结婚', '订盟', '纳采'] },
  { id: 'travel', name: { zh: '出行', en: 'Travel' }, terms: ['出行', '远行'] },
  { id: 'move', name: { zh: '搬家入宅', en: 'Move house' }, terms: ['入宅', '移徙', '搬家'] },
  { id: 'business', name: { zh: '开市', en: 'Open for business' }, terms: ['开市', '开业', '立券', '交易'] },
  { id: 'contract', name: { zh: '签约立券', en: 'Sign a contract' }, terms: ['立券', '交易', '纳财'] },
  { id: 'build', name: { zh: '动土修造', en: 'Build or renovate' }, terms: ['动土', '修造', '起基', '上梁'] },
  { id: 'bed', name: { zh: '安床', en: 'Set up a bed' }, terms: ['安床'] },
  { id: 'ritual', name: { zh: '祭祀祈福', en: 'Ritual or prayer' }, terms: ['祭祀', '祈福', '斋醮'] },
  { id: 'medicine', name: { zh: '求医治病', en: 'See a doctor' }, terms: ['求医', '治病', '针灸'] },
  { id: 'study', name: { zh: '入学考试', en: 'Study or examination' }, terms: ['入学', '上册', '进人口'] },
  { id: 'meet', name: { zh: '会友见贵', en: 'Meet people' }, terms: ['会亲友', '见贵', '出火'] },
  { id: 'grooming', name: { zh: '理发沐浴', en: 'Grooming' }, terms: ['理发', '沐浴', '整手足甲'] },
]

export interface ActivityJudgement {
  verdict: Verdict
  /** The almanac's own word that decided it, when there was one. */
  matched: string | null
  /** Why, in the almanac's terms. */
  basis: { zh: string; en: string }
}

/**
 * Whether the almanac holds a day to suit an undertaking.
 *
 * The 宜 and 忌 lists decide it when they mention the undertaking. When they
 * are silent, the day's own standing is reported instead, and the answer says
 * that the almanac does not name this undertaking rather than pretending to.
 */
export function judgeActivity(day: AlmanacDay, activity: Activity): ActivityJudgement {
  const inList = (list: string[]) => list.find((entry) => activity.terms.some((term) => entry.includes(term)))
  const avoided = inList(day.ji)
  const suited = inList(day.yi)
  // 诸事不宜: the almanac sometimes closes a day to everything.
  const closed = day.yi.some((entry) => entry.includes('诸事不宜') || entry.includes('馀事勿取'))

  if (avoided) {
    return {
      verdict: 'avoid',
      matched: avoided,
      basis: { zh: `今日忌「${avoided}」。`, en: `The almanac lists "${avoided}" among today's things to avoid.` },
    }
  }
  if (suited) {
    return {
      verdict: 'suitable',
      matched: suited,
      basis: { zh: `今日宜「${suited}」。`, en: `The almanac lists "${suited}" among today's suitable undertakings.` },
    }
  }
  if (closed) {
    return {
      verdict: 'avoid',
      matched: null,
      basis: { zh: '今日馀事勿取，未列之事一概不宜。', en: 'Today is marked as closed to undertakings not named, so this one is not favoured.' },
    }
  }
  return {
    verdict: 'neutral',
    matched: null,
    basis: {
      zh: `今日宜忌未提此事；${day.spirit.name}值日，属${day.spirit.road}，建除为「${day.dayOfficer}」，整体${STANDING_TEXT[day.standing].zh}。`,
      en: `The almanac does not name this undertaking today. ${day.spirit.name} governs the day on the ${day.spirit.road === '黄道' ? 'yellow' : 'black'} road, the officer is 「${day.dayOfficer}」, and the day overall is ${STANDING_TEXT[day.standing].en}.`,
    },
  }
}

export const STANDING_TEXT: Record<AlmanacDay['standing'], { zh: string; en: string }> = {
  auspicious: { zh: '偏吉', en: 'favourable' },
  mixed: { zh: '平平', en: 'mixed' },
  inauspicious: { zh: '偏凶', en: 'unfavourable' },
}

export const VERDICT_TEXT: Record<Verdict, { zh: string; en: string }> = {
  suitable: { zh: '宜', en: 'Suitable' },
  avoid: { zh: '忌', en: 'Better avoided' },
  neutral: { zh: '未载', en: 'Not named' },
}

/** The double hours the almanac marks as favourable, as a short list. */
export function luckyHours(day: AlmanacDay): AlmanacHour[] {
  return day.hours.filter((hour) => hour.lucky)
}

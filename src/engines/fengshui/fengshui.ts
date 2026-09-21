import { Solar } from 'lunar-typescript'

/**
 * Eight Mansions (八宅) feng shui: the personal trigram (命卦) from the birth
 * year and sex, its group (East or West), and the four auspicious and four
 * inauspicious directions. The compass heading comes from the device.
 */

export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'
export type GuaName = '坎' | '坤' | '震' | '巽' | '乾' | '兑' | '艮' | '离'

export interface SectorQuality {
  id: 'shengqi' | 'tianyi' | 'yannian' | 'fuwei' | 'huohai' | 'wugui' | 'liusha' | 'jueming'
  name: { zh: string; en: string }
  auspicious: boolean
  use: { zh: string; en: string }
}

export const QUALITIES: Record<SectorQuality['id'], SectorQuality> = {
  shengqi: { id: 'shengqi', name: { zh: '生气', en: 'Vitality (Sheng Qi)' }, auspicious: true, use: { zh: '最旺之方，宜主门、书桌、办公', en: 'The strongest sector: main door, desk, work.' } },
  tianyi: { id: 'tianyi', name: { zh: '天医', en: 'Health (Tian Yi)' }, auspicious: true, use: { zh: '宜卧室床位、厨房灶位', en: 'Bed position and kitchen stove; rest and recovery.' } },
  yannian: { id: 'yannian', name: { zh: '延年', en: 'Relationships (Yan Nian)' }, auspicious: true, use: { zh: '宜卧室、客厅，利感情与人际', en: 'Bedroom or living room; relationships and longevity.' } },
  fuwei: { id: 'fuwei', name: { zh: '伏位', en: 'Stability (Fu Wei)' }, auspicious: true, use: { zh: '宜静处、书房、神位', en: 'Quiet study, meditation, a steady base.' } },
  huohai: { id: 'huohai', name: { zh: '祸害', en: 'Mishap (Huo Hai)' }, auspicious: false, use: { zh: '宜储物、卫浴，避免久坐', en: 'Storage or bathroom; avoid long stays.' } },
  wugui: { id: 'wugui', name: { zh: '五鬼', en: 'Five Ghosts (Wu Gui)' }, auspicious: false, use: { zh: '宜厨房灶口朝此压制，不宜卧床', en: 'Point the stove mouth here to suppress it; not for the bed.' } },
  liusha: { id: 'liusha', name: { zh: '六煞', en: 'Six Killings (Liu Sha)' }, auspicious: false, use: { zh: '宜卫浴、杂物间', en: 'Bathroom or utility room.' } },
  jueming: { id: 'jueming', name: { zh: '绝命', en: 'Total Loss (Jue Ming)' }, auspicious: false, use: { zh: '最忌之方，宜储物或以厕所压制', en: 'The worst sector: storage, or a bathroom to press it down.' } },
}

export const DIRECTIONS: Direction[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
export const DIRECTION_TEXT: Record<Direction, { zh: string; en: string; degrees: number }> = {
  N: { zh: '北', en: 'North', degrees: 0 },
  NE: { zh: '东北', en: 'Northeast', degrees: 45 },
  E: { zh: '东', en: 'East', degrees: 90 },
  SE: { zh: '东南', en: 'Southeast', degrees: 135 },
  S: { zh: '南', en: 'South', degrees: 180 },
  SW: { zh: '西南', en: 'Southwest', degrees: 225 },
  W: { zh: '西', en: 'West', degrees: 270 },
  NW: { zh: '西北', en: 'Northwest', degrees: 315 },
}

/** Sector quality by personal trigram, in the order N, NE, E, SE, S, SW, W, NW. */
const TABLE: Record<GuaName, SectorQuality['id'][]> = {
  坎: ['fuwei', 'wugui', 'tianyi', 'shengqi', 'yannian', 'jueming', 'huohai', 'liusha'],
  离: ['yannian', 'huohai', 'shengqi', 'tianyi', 'fuwei', 'liusha', 'wugui', 'jueming'],
  震: ['tianyi', 'liusha', 'fuwei', 'yannian', 'shengqi', 'huohai', 'jueming', 'wugui'],
  巽: ['shengqi', 'jueming', 'yannian', 'fuwei', 'tianyi', 'wugui', 'liusha', 'huohai'],
  乾: ['liusha', 'tianyi', 'wugui', 'huohai', 'jueming', 'yannian', 'shengqi', 'fuwei'],
  坤: ['jueming', 'shengqi', 'huohai', 'wugui', 'liusha', 'fuwei', 'tianyi', 'yannian'],
  艮: ['wugui', 'fuwei', 'liusha', 'jueming', 'huohai', 'shengqi', 'yannian', 'tianyi'],
  兑: ['huohai', 'yannian', 'jueming', 'liusha', 'wugui', 'tianyi', 'fuwei', 'shengqi'],
}

const GUA_BY_NUMBER: Record<number, GuaName> = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 6: '乾', 7: '兑', 8: '艮', 9: '离' }
export const GUA_EN: Record<GuaName, string> = { 坎: 'Kan (Water)', 坤: 'Kun (Earth)', 震: 'Zhen (Thunder)', 巽: 'Xun (Wind)', 乾: 'Qian (Heaven)', 兑: 'Dui (Lake)', 艮: 'Gen (Mountain)', 离: 'Li (Fire)' }

/** The lunar (立春-bounded) year the birth falls in. */
export function baziYear(year: number, month: number, day: number): number {
  const solar = Solar.fromYmd(year, month, day)
  const liChun = solar.getLunar().getJieQiTable()['立春']
  return solar.toYmd() < liChun.toYmd() ? year - 1 : year
}

/**
 * Personal trigram number (命卦). Uses the common formula: sum the digits of
 * the year to a single digit; men subtract from 11 (born before 2000) or 10
 * (2000 on), women add 4 (before 2000) or 6 (2000 on); 5 becomes 2 for men
 * and 8 for women.
 */
export function guaNumber(year: number, gender: 'male' | 'female'): number {
  let digits = String(year).split('').reduce((a, b) => a + Number(b), 0)
  while (digits > 9) digits = String(digits).split('').reduce((a, b) => a + Number(b), 0)
  let result: number
  if (gender === 'male') {
    result = (year >= 2000 ? 10 : 11) - digits
    result = ((result - 1 + 9) % 9) + 1
    if (result === 5) result = 2
  } else {
    result = digits + (year >= 2000 ? 6 : 4)
    result = ((result - 1) % 9) + 1
    if (result === 5) result = 8
  }
  return result
}

export interface EightMansions {
  year: number
  guaNumber: number
  gua: GuaName
  group: 'east' | 'west'
  sectors: { direction: Direction; quality: SectorQuality }[]
  best: Direction
  worst: Direction
}

export function eightMansions(birthYear: number, birthMonth: number, birthDay: number, gender: 'male' | 'female'): EightMansions {
  const year = baziYear(birthYear, birthMonth, birthDay)
  const number = guaNumber(year, gender)
  const gua = GUA_BY_NUMBER[number]
  const sectors = DIRECTIONS.map((direction, index) => ({ direction, quality: QUALITIES[TABLE[gua][index]] }))
  return {
    year,
    guaNumber: number,
    gua,
    group: ['坎', '离', '震', '巽'].includes(gua) ? 'east' : 'west',
    sectors,
    best: sectors.find((s) => s.quality.id === 'shengqi')!.direction,
    worst: sectors.find((s) => s.quality.id === 'jueming')!.direction,
  }
}

/** The compass sector a heading (degrees clockwise from north) falls in. */
export function sectorForHeading(heading: number): Direction {
  const normalized = ((heading % 360) + 360) % 360
  return DIRECTIONS[Math.round(normalized / 45) % 8]
}

import * as Astronomy from 'astronomy-engine'

/**
 * Natal chart and daily transits from astronomy-engine (Don Cross, MIT),
 * which computes planetary positions to arc-minute accuracy. Longitudes are
 * true ecliptic of date, the tropical zodiac. Houses are whole-sign, with the
 * Ascendant and Midheaven computed from local sidereal time.
 */

export type BodyName = 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto'
export const BODIES: BodyName[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']

export const SIGNS = [
  { en: 'Aries', zh: '白羊座', symbol: '♈', element: 'fire' },
  { en: 'Taurus', zh: '金牛座', symbol: '♉', element: 'earth' },
  { en: 'Gemini', zh: '双子座', symbol: '♊', element: 'air' },
  { en: 'Cancer', zh: '巨蟹座', symbol: '♋', element: 'water' },
  { en: 'Leo', zh: '狮子座', symbol: '♌', element: 'fire' },
  { en: 'Virgo', zh: '处女座', symbol: '♍', element: 'earth' },
  { en: 'Libra', zh: '天秤座', symbol: '♎', element: 'air' },
  { en: 'Scorpio', zh: '天蝎座', symbol: '♏', element: 'water' },
  { en: 'Sagittarius', zh: '射手座', symbol: '♐', element: 'fire' },
  { en: 'Capricorn', zh: '摩羯座', symbol: '♑', element: 'earth' },
  { en: 'Aquarius', zh: '水瓶座', symbol: '♒', element: 'air' },
  { en: 'Pisces', zh: '双鱼座', symbol: '♓', element: 'water' },
] as const

export const BODY_TEXT: Record<BodyName, { zh: string; symbol: string }> = {
  Sun: { zh: '太阳', symbol: '☉' },
  Moon: { zh: '月亮', symbol: '☽' },
  Mercury: { zh: '水星', symbol: '☿' },
  Venus: { zh: '金星', symbol: '♀' },
  Mars: { zh: '火星', symbol: '♂' },
  Jupiter: { zh: '木星', symbol: '♃' },
  Saturn: { zh: '土星', symbol: '♄' },
  Uranus: { zh: '天王星', symbol: '♅' },
  Neptune: { zh: '海王星', symbol: '♆' },
  Pluto: { zh: '冥王星', symbol: '♇' },
}

export interface Placement {
  body: BodyName
  /** Ecliptic longitude 0–360. */
  longitude: number
  sign: number
  /** Degree within the sign, 0–30. */
  degree: number
  house: number
  retrograde: boolean
}

export interface Aspect {
  a: BodyName
  b: BodyName
  type: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'
  orb: number
}

export interface NatalChart {
  /** UTC instant used. */
  instant: string
  latitude: number
  longitude: number
  ascendant: number
  midheaven: number
  ascendantSign: number
  placements: Placement[]
  aspects: Aspect[]
  moonPhase: number
}

export interface ChartInput {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  utcOffsetHours: number
  latitude: number
  longitude: number
}

function normalize(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

function eclipticLongitude(body: Astronomy.Body, date: Date): number {
  const vector = Astronomy.GeoVector(body, date, true)
  const rotation = Astronomy.Rotation_EQJ_ECT(date)
  const ecliptic = Astronomy.RotateVector(rotation, vector)
  return normalize((Math.atan2(ecliptic.y, ecliptic.x) * 180) / Math.PI)
}

/** Mean obliquity of the ecliptic in degrees (IAU 2006 series, first terms). */
function obliquity(date: Date): number {
  const t = (date.getTime() / 86400000 - 10957.5) / 36525
  return 23.439291 - 0.0130042 * t - 1.64e-7 * t * t
}

/** Ascendant longitude from local sidereal time and latitude. */
export function ascendantFor(date: Date, latitude: number, longitude: number): { ascendant: number; midheaven: number } {
  const gast = Astronomy.SiderealTime(date) // hours
  const lst = normalize(gast * 15 + longitude)
  const ramc = (lst * Math.PI) / 180
  const eps = (obliquity(date) * Math.PI) / 180
  const lat = (latitude * Math.PI) / 180
  const midheaven = normalize((Math.atan2(Math.tan(ramc), Math.cos(eps)) * 180) / Math.PI + (Math.cos(ramc) < 0 ? 180 : 0))
  const ascendant = normalize(
    (Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps))) * 180) / Math.PI,
  )
  return { ascendant, midheaven }
}

const ASPECTS: { type: Aspect['type']; angle: number; orb: number }[] = [
  { type: 'conjunction', angle: 0, orb: 8 },
  { type: 'opposition', angle: 180, orb: 8 },
  { type: 'trine', angle: 120, orb: 7 },
  { type: 'square', angle: 90, orb: 7 },
  { type: 'sextile', angle: 60, orb: 5 },
]

export function aspectsBetween(placements: Placement[]): Aspect[] {
  const found: Aspect[] = []
  for (let i = 0; i < placements.length; i += 1) {
    for (let j = i + 1; j < placements.length; j += 1) {
      const separation = Math.abs(((placements[i].longitude - placements[j].longitude + 540) % 360) - 180)
      for (const aspect of ASPECTS) {
        const orb = Math.abs(separation - aspect.angle)
        if (orb <= aspect.orb) {
          found.push({ a: placements[i].body, b: placements[j].body, type: aspect.type, orb: Math.round(orb * 10) / 10 })
          break
        }
      }
    }
  }
  return found
}

export function computeChart(input: ChartInput): NatalChart {
  const date = new Date(Date.UTC(input.year, input.month - 1, input.day, input.hour - input.utcOffsetHours, input.minute))
  const { ascendant, midheaven } = ascendantFor(date, input.latitude, input.longitude)
  const ascendantSign = Math.floor(ascendant / 30)
  const placements: Placement[] = BODIES.map((body) => {
    const longitude = eclipticLongitude(Astronomy.Body[body], date)
    const later = eclipticLongitude(Astronomy.Body[body], new Date(date.getTime() + 86400000))
    const sign = Math.floor(longitude / 30)
    return {
      body,
      longitude,
      sign,
      degree: longitude - sign * 30,
      house: ((sign - ascendantSign + 12) % 12) + 1,
      retrograde: body !== 'Sun' && body !== 'Moon' && ((later - longitude + 540) % 360) - 180 < 0,
    }
  })
  return {
    instant: date.toISOString(),
    latitude: input.latitude,
    longitude: input.longitude,
    ascendant,
    midheaven,
    ascendantSign,
    placements,
    aspects: aspectsBetween(placements),
    moonPhase: Astronomy.MoonPhase(date),
  }
}

export interface Transit {
  transiting: BodyName
  natal: BodyName
  type: Aspect['type']
  orb: number
}

/** Today's planets against the natal placements, tighter orbs than natal aspects. */
export function transitsFor(chart: NatalChart, now: Date = new Date()): { positions: Placement[]; transits: Transit[] } {
  const positions: Placement[] = BODIES.map((body) => {
    const longitude = eclipticLongitude(Astronomy.Body[body], now)
    const sign = Math.floor(longitude / 30)
    return { body, longitude, sign, degree: longitude - sign * 30, house: ((sign - chart.ascendantSign + 12) % 12) + 1, retrograde: false }
  })
  const transits: Transit[] = []
  for (const moving of positions) {
    if (moving.body === 'Moon') continue
    for (const natal of chart.placements) {
      const separation = Math.abs(((moving.longitude - natal.longitude + 540) % 360) - 180)
      for (const aspect of ASPECTS) {
        const orb = Math.abs(separation - aspect.angle)
        if (orb <= Math.min(3, aspect.orb)) {
          transits.push({ transiting: moving.body, natal: natal.body, type: aspect.type, orb: Math.round(orb * 10) / 10 })
          break
        }
      }
    }
  }
  return { positions, transits: transits.sort((a, b) => a.orb - b.orb).slice(0, 6) }
}

export function formatDegree(longitude: number): string {
  const sign = Math.floor(longitude / 30)
  const inSign = longitude - sign * 30
  const deg = Math.floor(inSign)
  const min = Math.round((inSign - deg) * 60)
  return `${deg}°${String(min).padStart(2, '0')}′ ${SIGNS[sign].symbol}`
}

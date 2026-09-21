/**
 * The birth profile, entered once and kept only on this device. BaZi,
 * astrology and feng shui all read from it.
 */
export interface BirthProfile {
  name: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
  /** Whether the hour is known; when false, hour-based results are marked approximate. */
  timeKnown: boolean
  gender: 'male' | 'female'
  /** Birthplace, as the user typed it. */
  place: string
  latitude: number
  longitude: number
  utcOffsetHours: number
}

const KEY = 'lazyoracle.profile'

export const DEFAULT_PROFILE: BirthProfile = {
  name: '',
  year: 1990,
  month: 6,
  day: 15,
  hour: 12,
  minute: 0,
  timeKnown: true,
  gender: 'female',
  place: '',
  latitude: 31.23,
  longitude: 121.47,
  utcOffsetHours: 8,
}

export function loadProfile(): BirthProfile | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<BirthProfile>) }
  } catch {
    return null
  }
}

export function saveProfile(profile: BirthProfile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    // Storage blocked: the profile lives for this session only.
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

/** A handful of cities so the place can be picked without a map or network. */
export const CITIES: { name: { en: string; zh: string }; latitude: number; longitude: number; utcOffsetHours: number }[] = [
  { name: { en: 'Shanghai', zh: '上海' }, latitude: 31.23, longitude: 121.47, utcOffsetHours: 8 },
  { name: { en: 'Beijing', zh: '北京' }, latitude: 39.9, longitude: 116.4, utcOffsetHours: 8 },
  { name: { en: 'Guangzhou', zh: '广州' }, latitude: 23.13, longitude: 113.26, utcOffsetHours: 8 },
  { name: { en: 'Shenzhen', zh: '深圳' }, latitude: 22.54, longitude: 114.06, utcOffsetHours: 8 },
  { name: { en: 'Chengdu', zh: '成都' }, latitude: 30.57, longitude: 104.07, utcOffsetHours: 8 },
  { name: { en: 'Chongqing', zh: '重庆' }, latitude: 29.56, longitude: 106.55, utcOffsetHours: 8 },
  { name: { en: 'Wuhan', zh: '武汉' }, latitude: 30.59, longitude: 114.31, utcOffsetHours: 8 },
  { name: { en: "Xi'an", zh: '西安' }, latitude: 34.34, longitude: 108.94, utcOffsetHours: 8 },
  { name: { en: 'Hangzhou', zh: '杭州' }, latitude: 30.27, longitude: 120.15, utcOffsetHours: 8 },
  { name: { en: 'Nanjing', zh: '南京' }, latitude: 32.06, longitude: 118.8, utcOffsetHours: 8 },
  { name: { en: 'Harbin', zh: '哈尔滨' }, latitude: 45.8, longitude: 126.53, utcOffsetHours: 8 },
  { name: { en: 'Urumqi', zh: '乌鲁木齐' }, latitude: 43.83, longitude: 87.62, utcOffsetHours: 8 },
  { name: { en: 'Hong Kong', zh: '香港' }, latitude: 22.32, longitude: 114.17, utcOffsetHours: 8 },
  { name: { en: 'Taipei', zh: '台北' }, latitude: 25.03, longitude: 121.56, utcOffsetHours: 8 },
  { name: { en: 'Singapore', zh: '新加坡' }, latitude: 1.35, longitude: 103.82, utcOffsetHours: 8 },
  { name: { en: 'Kuala Lumpur', zh: '吉隆坡' }, latitude: 3.14, longitude: 101.69, utcOffsetHours: 8 },
  { name: { en: 'Tokyo', zh: '东京' }, latitude: 35.68, longitude: 139.69, utcOffsetHours: 9 },
  { name: { en: 'Seoul', zh: '首尔' }, latitude: 37.57, longitude: 126.98, utcOffsetHours: 9 },
  { name: { en: 'Bangkok', zh: '曼谷' }, latitude: 13.76, longitude: 100.5, utcOffsetHours: 7 },
  { name: { en: 'Sydney', zh: '悉尼' }, latitude: -33.87, longitude: 151.21, utcOffsetHours: 10 },
  { name: { en: 'London', zh: '伦敦' }, latitude: 51.51, longitude: -0.13, utcOffsetHours: 0 },
  { name: { en: 'Paris', zh: '巴黎' }, latitude: 48.86, longitude: 2.35, utcOffsetHours: 1 },
  { name: { en: 'Berlin', zh: '柏林' }, latitude: 52.52, longitude: 13.4, utcOffsetHours: 1 },
  { name: { en: 'New York', zh: '纽约' }, latitude: 40.71, longitude: -74.01, utcOffsetHours: -5 },
  { name: { en: 'Los Angeles', zh: '洛杉矶' }, latitude: 34.05, longitude: -118.24, utcOffsetHours: -8 },
  { name: { en: 'Toronto', zh: '多伦多' }, latitude: 43.65, longitude: -79.38, utcOffsetHours: -5 },
  { name: { en: 'Vancouver', zh: '温哥华' }, latitude: 49.28, longitude: -123.12, utcOffsetHours: -8 },
  { name: { en: 'Dubai', zh: '迪拜' }, latitude: 25.2, longitude: 55.27, utcOffsetHours: 4 },
]

/**
 * Palmistry from hand landmarks. The camera image is analysed on the device by
 * MediaPipe Hand Landmarker (21 points); this module turns those points into
 * the readings classical palmistry actually makes from a hand:
 *
 * - the elemental hand shape, from palm proportions;
 * - each finger's length against the middle finger, which is how the Jupiter,
 *   Saturn, Apollo and Mercury fingers are judged;
 * - the thumb's opening angle and how widely the fingers are held;
 * - the eight palaces of the Chinese palm (八宫), whose fullness is estimated
 *   from the depth the landmarker reports for the base of each finger and for
 *   the two sides of the palm.
 *
 * Palm lines cannot be traced from landmarks, so the three major lines are
 * described by the reader in three taps. Everything here is deterministic: the
 * same hand and the same taps always give the same facts, and the language
 * model only puts them into words.
 */

export interface Point {
  x: number
  y: number
  z?: number
}

export type HandShape = 'earth' | 'air' | 'fire' | 'water'

export interface LineTraits {
  /** Heart line ends under the index finger (idealistic) or the middle finger (pragmatic). */
  heart: 'index' | 'middle' | 'between'
  /** Head line straight (analytical) or curved (imaginative). */
  head: 'straight' | 'curved'
  /** Life line sweeps wide (energetic, outgoing) or hugs the thumb (cautious, reserved). */
  life: 'wide' | 'close'
  /** A fate line running up the centre of the palm, which the reader looks for. */
  fate: 'present' | 'absent' | 'unsure'
}

/** The four fingers, by the planet classical palmistry assigns to each. */
export type FingerName = 'jupiter' | 'saturn' | 'apollo' | 'mercury'

export interface FingerTrait {
  finger: FingerName
  /** Length as a fraction of the middle finger, which is the classical yardstick. */
  ratioToSaturn: number
  length: 'long' | 'average' | 'short'
}

/** The eight palaces of the palm, arranged as the later-heaven eight trigrams. */
export type Palace = '巽' | '离' | '坤' | '兑' | '乾' | '坎' | '艮' | '震'

export interface PalaceReading {
  palace: Palace
  /**
   * How far the palace stands out of the palm plane, as a fraction of palm
   * length, from the depth the landmarker reports. Positive means raised.
   */
  prominence: number
  state: 'full' | 'even' | 'flat'
}

export interface PalmFeatures {
  shape: HandShape
  palmLength: number
  palmWidth: number
  fingerLength: number
  /** fingerLength / palmLength. */
  fingerRatio: number
  /** palmWidth / palmLength. */
  palmRatio: number
  /** Index finger vs ring finger length: > 1 means the index is longer. */
  indexToRing: number
  thumbSpread: number
  /** Angle between the thumb and the index finger, in degrees. */
  thumbAngle: number
  /** How widely the fingers are held apart, as a fraction of palm width. */
  openness: number
  fingers: FingerTrait[]
  palaces: PalaceReading[]
  /** The palaces that stand out most, fullest first; at most two. */
  strongPalaces: Palace[]
  lines: LineTraits
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * t }
}

function centroid(points: Point[]): Point {
  const n = points.length
  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / n,
    y: points.reduce((sum, p) => sum + p.y, 0) / n,
    z: points.reduce((sum, p) => sum + (p.z ?? 0), 0) / n,
  }
}

/** Angle ABC at B, in degrees. */
function angleAt(a: Point, b: Point, c: Point): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y }
  const v2 = { x: c.x - b.x, y: c.y - b.y }
  const dot = v1.x * v2.x + v1.y * v2.y
  const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y)
  if (!mag) return 0
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI
}

/** Typical length of each finger as a fraction of the middle finger. */
const FINGER_NORM: Record<FingerName, number> = { jupiter: 0.9, saturn: 1, apollo: 0.93, mercury: 0.72 }

function classifyFinger(finger: FingerName, ratio: number): FingerTrait['length'] {
  const norm = FINGER_NORM[finger]
  if (ratio >= norm * 1.04) return 'long'
  if (ratio <= norm * 0.96) return 'short'
  return 'average'
}

/**
 * MediaPipe landmark indices: 0 wrist, 1–4 thumb, 5–8 index, 9–12 middle,
 * 13–16 ring, 17–20 pinky; the last of each run is the tip. The z coordinate
 * is depth relative to the wrist, negative towards the camera, on roughly the
 * same scale as x, which is what makes the palace estimate possible.
 */
export function palmFeatures(landmarks: Point[], lines: LineTraits): PalmFeatures {
  if (landmarks.length < 21) throw new Error('need 21 hand landmarks')
  const wrist = landmarks[0]
  const middleBase = landmarks[9]
  const palmLength = distance(wrist, middleBase)
  const palmWidth = distance(landmarks[5], landmarks[17])
  const fingerLength = distance(middleBase, landmarks[12])
  const indexLength = distance(landmarks[5], landmarks[8])
  const ringLength = distance(landmarks[13], landmarks[16])
  const thumbSpread = distance(landmarks[4], landmarks[5]) / palmWidth
  const fingerRatio = fingerLength / palmLength
  const palmRatio = palmWidth / palmLength
  // Classical typology: square palm (wide) vs long palm; short vs long fingers.
  const square = palmRatio >= 0.86
  const longFingers = fingerRatio >= 0.78
  const shape: HandShape = square ? (longFingers ? 'air' : 'earth') : longFingers ? 'water' : 'fire'

  // The thumb's opening, measured between the thumb and the index finger.
  const thumbAngle = Math.round(angleAt(landmarks[4], landmarks[2], landmarks[8]))

  // How widely the fingers are held, from the gaps between the four fingertips.
  const gaps = [distance(landmarks[8], landmarks[12]), distance(landmarks[12], landmarks[16]), distance(landmarks[16], landmarks[20])]
  const openness = Math.round(((gaps.reduce((sum, g) => sum + g, 0) / gaps.length) / palmWidth) * 100) / 100

  const saturnLength = fingerLength
  const fingerLengths: Record<FingerName, number> = {
    jupiter: indexLength,
    saturn: saturnLength,
    apollo: ringLength,
    mercury: distance(landmarks[17], landmarks[20]),
  }
  const fingers: FingerTrait[] = (Object.keys(FINGER_NORM) as FingerName[]).map((finger) => {
    const ratio = Math.round((fingerLengths[finger] / saturnLength) * 100) / 100
    return { finger, ratioToSaturn: ratio, length: classifyFinger(finger, ratio) }
  })

  const palaces = readPalaces(landmarks, palmLength)
  const strongPalaces = palaces
    .filter((p) => p.state === 'full')
    .sort((a, b) => b.prominence - a.prominence)
    .slice(0, 2)
    .map((p) => p.palace)

  return {
    shape,
    palmLength,
    palmWidth,
    fingerLength,
    fingerRatio,
    palmRatio,
    indexToRing: indexLength / ringLength,
    thumbSpread,
    thumbAngle,
    openness,
    fingers,
    palaces,
    strongPalaces,
    lines,
  }
}

/**
 * The eight palaces sit around the palm in the later-heaven arrangement: 巽 at
 * the base of the index finger, then 离, 坤 and 兑 across the top, 乾 on the
 * outer edge above the wrist, 坎 at the wrist itself, and 艮 and 震 on the
 * thumb side. Each is anchored to the landmarks nearest it; fullness is the
 * depth of that anchor against the plane of the palm.
 */
function readPalaces(landmarks: Point[], palmLength: number): PalaceReading[] {
  const wrist = landmarks[0]
  const centre = centroid([landmarks[0], landmarks[5], landmarks[17]])
  const anchors: Record<Palace, Point> = {
    巽: landmarks[5],
    离: landmarks[9],
    坤: landmarks[13],
    兑: landmarks[17],
    乾: lerp(wrist, landmarks[17], 0.45),
    坎: lerp(wrist, centre, 0.4),
    艮: lerp(wrist, landmarks[1], 0.5),
    震: landmarks[2],
  }
  // The palm plane is taken from the wrist and the two ends of the knuckle
  // line, so a raised mount reads as depth above that plane.
  const base = ((wrist.z ?? 0) + (landmarks[5].z ?? 0) + (landmarks[17].z ?? 0)) / 3
  const raw = (Object.keys(anchors) as Palace[]).map((palace) => ({
    palace,
    prominence: Math.round(((base - (anchors[palace].z ?? 0)) / (palmLength || 1)) * 1000) / 1000,
  }))
  const mean = raw.reduce((sum, p) => sum + p.prominence, 0) / raw.length
  const spread = Math.sqrt(raw.reduce((sum, p) => sum + (p.prominence - mean) ** 2, 0) / raw.length) || 1
  return raw.map((p) => ({
    ...p,
    state: p.prominence > mean + spread * 0.6 ? 'full' : p.prominence < mean - spread * 0.6 ? 'flat' : 'even',
  }))
}

export const SHAPE_TEXT: Record<HandShape, { zh: string; en: string; keywords: { zh: string[]; en: string[] } }> = {
  earth: { zh: '土型手（方掌短指）', en: 'Earth hand (square palm, short fingers)', keywords: { zh: ['务实', '可靠', '喜欢动手'], en: ['practical', 'reliable', 'hands-on'] } },
  air: { zh: '风型手（方掌长指）', en: 'Air hand (square palm, long fingers)', keywords: { zh: ['好奇', '善沟通', '重思考'], en: ['curious', 'communicative', 'analytical'] } },
  fire: { zh: '火型手（长掌短指）', en: 'Fire hand (long palm, short fingers)', keywords: { zh: ['热情', '果断', '爱冒险'], en: ['energetic', 'decisive', 'adventurous'] } },
  water: { zh: '水型手（长掌长指）', en: 'Water hand (long palm, long fingers)', keywords: { zh: ['敏感', '富想象', '情感细腻'], en: ['sensitive', 'imaginative', 'emotionally attuned'] } },
}

export const LINE_TEXT = {
  heart: {
    index: { zh: '感情线止于食指下：理想主义，对感情期望高。', en: 'Heart line ends under the index finger: idealistic, high hopes in love.' },
    middle: { zh: '感情线止于中指下：务实，重视安全感。', en: 'Heart line ends under the middle finger: pragmatic, values security.' },
    between: { zh: '感情线止于两指之间：理想与务实兼有。', en: 'Heart line ends between the two: a mix of idealism and pragmatism.' },
  },
  head: {
    straight: { zh: '智慧线平直：思路清晰，偏好逻辑与结构。', en: 'Straight head line: clear thinking, a taste for logic and structure.' },
    curved: { zh: '智慧线弯曲：富想象，善于联想与创造。', en: 'Curved head line: imaginative, associative, creative.' },
  },
  life: {
    wide: { zh: '生命线弧度开阔：精力充沛，外向好动。', en: 'Wide life line: plenty of energy, outgoing.' },
    close: { zh: '生命线贴近拇指：谨慎稳重，偏好熟悉的环境。', en: 'Life line close to the thumb: cautious, steady, fond of the familiar.' },
  },
  fate: {
    present: { zh: '事业线清晰：方向感明确，容易长期专注一件事。', en: 'A clear fate line: a settled sense of direction, able to stay with one thing for years.' },
    absent: { zh: '事业线不明：路径由自己一段段走出来，不受既定轨道限制。', en: 'No clear fate line: a path made in stages rather than laid out in advance.' },
    unsure: { zh: '事业线难以判断：方向仍在成形之中。', en: 'The fate line is hard to make out: the direction is still taking shape.' },
  },
} as const

export const FINGER_TEXT: Record<FingerName, { zh: string; en: string; long: { zh: string; en: string }; short: { zh: string; en: string } }> = {
  jupiter: {
    zh: '食指（木星丘）',
    en: 'index finger (Jupiter)',
    long: { zh: '食指偏长：有主张，愿意带头。', en: 'a long index finger: self-assured, willing to lead.' },
    short: { zh: '食指偏短：不爱出头，更重实际。', en: 'a short index finger: happier out of the spotlight, practical.' },
  },
  saturn: {
    zh: '中指（土星丘）',
    en: 'middle finger (Saturn)',
    long: { zh: '中指修长：自律，做事有分寸。', en: 'a long middle finger: disciplined, careful with limits.' },
    short: { zh: '中指偏短：随性，不受规矩束缚。', en: 'a short middle finger: easy-going, not bound by rules.' },
  },
  apollo: {
    zh: '无名指（太阳丘）',
    en: 'ring finger (Apollo)',
    long: { zh: '无名指偏长：审美强，敢冒风险。', en: 'a long ring finger: a strong eye for beauty, willing to take a risk.' },
    short: { zh: '无名指偏短：低调，不为掌声做事。', en: 'a short ring finger: understated, not working for applause.' },
  },
  mercury: {
    zh: '小指（水星丘）',
    en: 'little finger (Mercury)',
    long: { zh: '小指偏长：口才好，善于交涉。', en: 'a long little finger: articulate, good at negotiating.' },
    short: { zh: '小指偏短：话不多，做多于说。', en: 'a short little finger: says little, does more.' },
  },
}

export const PALACE_TEXT: Record<Palace, { zh: string; en: string; full: { zh: string; en: string }; flat: { zh: string; en: string } }> = {
  巽: {
    zh: '巽宫（食指根）',
    en: 'the Xun palace, at the base of the index finger',
    full: { zh: '巽宫饱满：财源与人脉自来，适合经营关系。', en: 'full: resources and contacts come easily; relationships are worth tending.' },
    flat: { zh: '巽宫平坦：进财靠稳扎稳打，不宜投机。', en: 'flat: gains come steadily rather than suddenly; speculation does not suit.' },
  },
  离: {
    zh: '离宫（中指根）',
    en: 'the Li palace, at the base of the middle finger',
    full: { zh: '离宫饱满：名声与见识出众，容易被看见。', en: 'full: reputation and insight stand out; you are easily noticed.' },
    flat: { zh: '离宫平坦：低调行事，成果慢慢累积。', en: 'flat: a quieter path, with results that accumulate slowly.' },
  },
  坤: {
    zh: '坤宫（无名指根）',
    en: 'the Kun palace, at the base of the ring finger',
    full: { zh: '坤宫饱满：与人合作顺，得长辈与同伴之助。', en: 'full: partnership goes well, with help from elders and companions.' },
    flat: { zh: '坤宫平坦：更习惯独立完成，合作需要磨合。', en: 'flat: used to working alone; partnership takes adjusting.' },
  },
  兑: {
    zh: '兑宫（小指根）',
    en: 'the Dui palace, at the base of the little finger',
    full: { zh: '兑宫饱满：言语讨喜，子女与晚辈缘分深。', en: 'full: a pleasing way with words, close ties with the young.' },
    flat: { zh: '兑宫平坦：表达含蓄，心事不轻易说出。', en: 'flat: reserved in speech, not quick to say what is on your mind.' },
  },
  乾: {
    zh: '乾宫（掌外下侧）',
    en: 'the Qian palace, on the outer edge above the wrist',
    full: { zh: '乾宫饱满：家业与父辈庇荫，晚运转厚。', en: 'full: support from family and from the previous generation; later years grow easier.' },
    flat: { zh: '乾宫平坦：靠自己立足，少倚外援。', en: 'flat: standing on your own, with little outside support.' },
  },
  坎: {
    zh: '坎宫（腕上掌心下）',
    en: 'the Kan palace, at the base of the palm',
    full: { zh: '坎宫饱满：根基稳，体力与积蓄都有底。', en: 'full: a solid base, in both stamina and savings.' },
    flat: { zh: '坎宫平坦：需要照顾作息与储备。', en: 'flat: rest and reserves need looking after.' },
  },
  艮: {
    zh: '艮宫（拇指根下方）',
    en: 'the Gen palace, below the ball of the thumb',
    full: { zh: '艮宫饱满：守得住，田宅与旧物有情。', en: 'full: able to hold on to things; attached to home and to what lasts.' },
    flat: { zh: '艮宫平坦：不恋旧，愿意搬迁与更换。', en: 'flat: not attached to the past, willing to move on.' },
  },
  震: {
    zh: '震宫（拇指球）',
    en: 'the Zhen palace, the ball of the thumb',
    full: { zh: '震宫饱满：元气足，行动力与热情旺盛。', en: 'full: plenty of vitality, drive and warmth.' },
    flat: { zh: '震宫平坦：体力有限，宜量力而行。', en: 'flat: limited stamina; pace yourself.' },
  },
}

export function thumbAngleText(angle: number, language: 'zh' | 'en'): string {
  if (angle >= 60) {
    return language === 'zh' ? `拇指开角约 ${angle}°，开阔：慷慨、容易接纳新事物。` : `The thumb opens about ${angle} degrees, which is wide: generous and open to what is new.`
  }
  if (angle <= 40) {
    return language === 'zh' ? `拇指开角约 ${angle}°，收敛：谨慎、守得住自己的底线。` : `The thumb opens about ${angle} degrees, which is narrow: careful, and firm about your own limits.`
  }
  return language === 'zh' ? `拇指开角约 ${angle}°，中等：能放能收。` : `The thumb opens about ${angle} degrees, in the middle range: able to give and to hold back.`
}

export function opennessText(openness: number, language: 'zh' | 'en'): string {
  if (openness >= 0.3) return language === 'zh' ? '五指自然张开：心思外放，不藏事。' : 'The fingers rest wide apart: open, with little kept back.'
  if (openness <= 0.18) return language === 'zh' ? '五指并拢：心思细密，习惯先想后说。' : 'The fingers rest close together: careful, thinking before speaking.'
  return language === 'zh' ? '五指松紧适中：该说时说，该收时收。' : 'The fingers rest neither wide nor tight: speaking up and holding back as each moment asks.'
}

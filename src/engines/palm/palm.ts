/**
 * Palmistry from hand landmarks. The camera image is analysed on the device by
 * MediaPipe Hand Landmarker (21 points); this module turns those points into
 * the classical hand-shape classification and finger proportions. Palm lines
 * cannot be read reliably from landmarks, so the learner describes the three
 * major lines with three taps and the reading is built from that plus the
 * measured shape. Everything here is deterministic.
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
  lines: LineTraits
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * MediaPipe landmark indices: 0 wrist, 1–4 thumb, 5–8 index, 9–12 middle,
 * 13–16 ring, 17–20 pinky; the last of each run is the tip.
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
  return { shape, palmLength, palmWidth, fingerLength, fingerRatio, palmRatio, indexToRing: indexLength / ringLength, thumbSpread, lines }
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
} as const

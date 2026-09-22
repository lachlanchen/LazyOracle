/**
 * Face reading (面相) from face landmarks. MediaPipe Face Landmarker returns
 * 478 points on the device; this module turns them into the measurements
 * Chinese physiognomy actually works from:
 *
 * - 三停, the three courts: forehead, middle face and lower face, judged by
 *   how evenly the face divides into them;
 * - 五眼, the five-eye rule: a well-proportioned face is five eye-widths
 *   across, and the gap between the eyes is one eye-width;
 * - 五行面型, the elemental face type, from height against width and how the
 *   forehead compares with the jaw;
 * - a set of the 十二宫 palaces that can honestly be measured from geometry:
 *   命宫 between the brows, 官禄宫 across the forehead, 田宅宫 above the eyes,
 *   疾厄宫 on the bridge of the nose, 财帛宫 at the nose, 兄弟宫 at the brows,
 *   夫妻宫 at the temples and 奴仆宫 along the jaw;
 * - symmetry, measured against the midline of the face.
 *
 * Everything is deterministic and relative: every measurement is a ratio, so
 * the distance from the camera and the size of the photo do not change the
 * reading. The photo itself never leaves the device.
 */

export interface Point {
  x: number
  y: number
  z?: number
}

export type FaceElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

export interface Court {
  court: 'upper' | 'middle' | 'lower'
  /** Share of the face's height, where an even face gives each court a third. */
  share: number
  state: 'long' | 'even' | 'short'
}

export type FacePalace = '命宫' | '官禄宫' | '田宅宫' | '疾厄宫' | '财帛宫' | '兄弟宫' | '夫妻宫' | '奴仆宫'

export interface FacePalaceReading {
  palace: FacePalace
  /** The measured ratio behind the judgement, kept so the reading can cite it. */
  value: number
  state: 'generous' | 'even' | 'narrow'
}

export interface FaceFeatures {
  element: FaceElement
  courts: Court[]
  /** Face width divided by eye width; the classical ideal is five. */
  eyesAcross: number
  /** Gap between the eyes divided by eye width; the ideal is one. */
  eyeGap: number
  /** Face height divided by face width. */
  heightRatio: number
  /** Jaw width and forehead width, each against the width at the cheekbones. */
  jawRatio: number
  foreheadRatio: number
  /** 0 to 1, where 1 is a perfectly symmetrical face. */
  symmetry: number
  palaces: FacePalaceReading[]
  /** The palaces that stand out, most generous first; at most two. */
  strongPalaces: FacePalace[]
}

/**
 * Landmark indices used, in the MediaPipe Face Mesh numbering.
 * 10 top of the forehead, 152 chin, 9 glabella between the brows, 2 under the
 * nose, 33/133 left eye corners, 362/263 right eye corners, 234/454 cheekbones,
 * 172/397 jaw, 127/356 temples, 61/291 mouth corners, 129/358 nose wings,
 * 105/334 brow peaks, 107/336 brow inner ends, 46/276 brow outer ends,
 * 159/386 upper eyelids, 193/417 the sides of the nose bridge, 1 nose tip.
 */
const I = {
  forehead: 10,
  chin: 152,
  glabella: 9,
  subnasale: 2,
  noseTip: 1,
  eyeLeftOuter: 33,
  eyeLeftInner: 133,
  eyeRightInner: 362,
  eyeRightOuter: 263,
  cheekLeft: 234,
  cheekRight: 454,
  jawLeft: 172,
  jawRight: 397,
  templeLeft: 127,
  templeRight: 356,
  mouthLeft: 61,
  mouthRight: 291,
  noseWingLeft: 129,
  noseWingRight: 358,
  browLeftPeak: 105,
  browRightPeak: 334,
  browLeftInner: 107,
  browRightInner: 336,
  browLeftOuter: 46,
  browRightOuter: 276,
  lidLeft: 159,
  lidRight: 386,
  bridgeLeft: 193,
  bridgeRight: 417,
} as const

export const FACE_LANDMARKS_REQUIRED = 468

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function classify(value: number, ideal: number, tolerance: number): 'generous' | 'even' | 'narrow' {
  if (value >= ideal * (1 + tolerance)) return 'generous'
  if (value <= ideal * (1 - tolerance)) return 'narrow'
  return 'even'
}

function courtState(share: number): Court['state'] {
  if (share >= 0.36) return 'long'
  if (share <= 0.3) return 'short'
  return 'even'
}

export function faceFeatures(landmarks: Point[]): FaceFeatures {
  if (landmarks.length < FACE_LANDMARKS_REQUIRED) throw new Error(`need ${FACE_LANDMARKS_REQUIRED} face landmarks`)
  const at = (index: number) => landmarks[index]

  const faceHeight = Math.abs(at(I.chin).y - at(I.forehead).y)
  const faceWidth = distance(at(I.cheekLeft), at(I.cheekRight))
  const browLine = (at(I.browLeftInner).y + at(I.browRightInner).y) / 2

  // 三停: forehead to brow, brow to the base of the nose, nose to chin.
  const upper = Math.abs(browLine - at(I.forehead).y)
  const middle = Math.abs(at(I.subnasale).y - browLine)
  const lower = Math.abs(at(I.chin).y - at(I.subnasale).y)
  const total = upper + middle + lower || 1
  const courts: Court[] = (
    [
      ['upper', upper],
      ['middle', middle],
      ['lower', lower],
    ] as const
  ).map(([court, height]) => {
    const share = Math.round((height / total) * 1000) / 1000
    return { court, share, state: courtState(share) }
  })

  // 五眼: the face should be five eye-widths across, with one eye between them.
  const eyeWidth = (distance(at(I.eyeLeftOuter), at(I.eyeLeftInner)) + distance(at(I.eyeRightInner), at(I.eyeRightOuter))) / 2 || 1
  const eyesAcross = Math.round((faceWidth / eyeWidth) * 100) / 100
  const eyeGap = Math.round((distance(at(I.eyeLeftInner), at(I.eyeRightInner)) / eyeWidth) * 100) / 100

  const jawWidth = distance(at(I.jawLeft), at(I.jawRight))
  const foreheadWidth = distance(at(I.templeLeft), at(I.templeRight))
  const heightRatio = Math.round((faceHeight / (faceWidth || 1)) * 100) / 100
  const jawRatio = Math.round((jawWidth / (faceWidth || 1)) * 100) / 100
  const foreheadRatio = Math.round((foreheadWidth / (faceWidth || 1)) * 100) / 100

  // On an ordinary face the temples measure about nine tenths of the
  // cheekbones and the jaw about eight tenths, so only a markedly wider
  // forehead over a markedly narrower jaw counts as the fire triangle.
  const element: FaceElement =
    heightRatio >= 1.45
      ? 'wood'
      : foreheadRatio - jawRatio >= 0.18
        ? 'fire'
        : jawRatio >= 0.9 && heightRatio <= 1.3
          ? 'earth'
          : heightRatio <= 1.2
            ? 'water'
            : 'metal'

  // Symmetry against the midline running from the forehead to the chin.
  const midline = (at(I.forehead).x + at(I.chin).x) / 2
  const pairs: [number, number][] = [
    [I.cheekLeft, I.cheekRight],
    [I.jawLeft, I.jawRight],
    [I.eyeLeftOuter, I.eyeRightOuter],
    [I.mouthLeft, I.mouthRight],
    [I.browLeftPeak, I.browRightPeak],
  ]
  const asymmetry =
    pairs.reduce((sum, [left, right]) => sum + Math.abs(Math.abs(at(left).x - midline) - Math.abs(at(right).x - midline)), 0) / pairs.length
  const symmetry = Math.round(Math.max(0, 1 - asymmetry / (faceWidth / 2 || 1)) * 100) / 100

  const browGap = distance(at(I.browLeftInner), at(I.browRightInner))
  const browLength = (distance(at(I.browLeftInner), at(I.browLeftOuter)) + distance(at(I.browRightInner), at(I.browRightOuter))) / 2
  const lidSpace = (Math.abs(at(I.lidLeft).y - at(I.browLeftPeak).y) + Math.abs(at(I.lidRight).y - at(I.browRightPeak).y)) / 2
  const bridgeWidth = distance(at(I.bridgeLeft), at(I.bridgeRight))
  const noseWidth = distance(at(I.noseWingLeft), at(I.noseWingRight))
  const mouthWidth = distance(at(I.mouthLeft), at(I.mouthRight))
  const templeWidth = distance(at(I.templeLeft), at(I.templeRight))

  const palaces: FacePalaceReading[] = [
    // 命宫: the space between the brows, against one eye-width. Classically a
    // palm's two fingers wide is open; pinched brows are said to be anxious.
    { palace: '命宫', value: round(browGap / eyeWidth), state: classify(browGap / eyeWidth, 1, 0.15) },
    // 官禄宫: the forehead, by the share of the face it takes.
    { palace: '官禄宫', value: courts[0].share, state: classify(courts[0].share, 0.333, 0.08) },
    // 田宅宫: the space between brow and eyelid, against eye width.
    { palace: '田宅宫', value: round(lidSpace / eyeWidth), state: classify(lidSpace / eyeWidth, 0.42, 0.18) },
    // 疾厄宫: the bridge of the nose, against eye width.
    { palace: '疾厄宫', value: round(bridgeWidth / eyeWidth), state: classify(bridgeWidth / eyeWidth, 0.62, 0.15) },
    // 财帛宫: the nose, against the mouth.
    { palace: '财帛宫', value: round(noseWidth / mouthWidth), state: classify(noseWidth / mouthWidth, 0.78, 0.12) },
    // 兄弟宫: brow length, against eye width.
    { palace: '兄弟宫', value: round(browLength / eyeWidth), state: classify(browLength / eyeWidth, 1.15, 0.15) },
    // 夫妻宫: the temples, against the cheekbones.
    { palace: '夫妻宫', value: round(templeWidth / faceWidth), state: classify(templeWidth / faceWidth, 1, 0.06) },
    // 奴仆宫: the jaw, against the cheekbones.
    { palace: '奴仆宫', value: jawRatio, state: classify(jawRatio, 0.86, 0.08) },
  ]

  const strongPalaces = palaces
    .filter((palace) => palace.state === 'generous')
    .sort((a, b) => b.value - a.value)
    .slice(0, 2)
    .map((palace) => palace.palace)

  return { element, courts, eyesAcross, eyeGap, heightRatio, jawRatio, foreheadRatio, symmetry, palaces, strongPalaces }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

export const ELEMENT_TEXT: Record<FaceElement, { zh: string; en: string; keywords: { zh: string[]; en: string[] } }> = {
  wood: {
    zh: '木型面（面长清瘦）',
    en: 'Wood face (long and lean)',
    keywords: { zh: ['清雅', '有主见', '耐得住'], en: ['refined', 'independent-minded', 'able to wait'] },
  },
  fire: {
    zh: '火型面（上阔下尖）',
    en: 'Fire face (broad above, narrow below)',
    keywords: { zh: ['机敏', '反应快', '性子急'], en: ['quick-witted', 'fast to react', 'impatient'] },
  },
  earth: {
    zh: '土型面（方厚敦实）',
    en: 'Earth face (square and solid)',
    keywords: { zh: ['厚重', '守信', '能承担'], en: ['steady', 'dependable', 'able to carry weight'] },
  },
  metal: {
    zh: '金型面（方正端整）',
    en: 'Metal face (square and even)',
    keywords: { zh: ['果断', '有条理', '重原则'], en: ['decisive', 'orderly', 'principled'] },
  },
  water: {
    zh: '水型面（圆润丰满）',
    en: 'Water face (round and full)',
    keywords: { zh: ['圆融', '亲和', '善周旋'], en: ['adaptable', 'warm', 'good among people'] },
  },
}

export const COURT_TEXT: Record<Court['court'], { zh: string; en: string; long: { zh: string; en: string }; short: { zh: string; en: string }; even: { zh: string; en: string } }> = {
  upper: {
    zh: '上停（发际至眉）',
    en: 'the upper court, hairline to brow',
    long: { zh: '上停宽长：早年得庇荫，思虑与规划见长。', en: 'long: an early life with support, and a head for planning.' },
    short: { zh: '上停偏短：早年自立，靠实做而非筹谋。', en: 'short: an early life on your own, made by doing rather than planning.' },
    even: { zh: '上停匀称：早年平顺。', en: 'even: an unremarkable, steady start.' },
  },
  middle: {
    zh: '中停（眉至鼻底）',
    en: 'the middle court, brow to the base of the nose',
    long: { zh: '中停饱满：中年当运，行动与事业最见力量。', en: 'long: the middle years carry the most force, in work and in action.' },
    short: { zh: '中停偏短：中年需借助他人之力，不宜独撑。', en: 'short: the middle years go better with help than alone.' },
    even: { zh: '中停匀称：中年稳进。', en: 'even: steady progress through the middle years.' },
  },
  lower: {
    zh: '下停（鼻底至下颏）',
    en: 'the lower court, nose to chin',
    long: { zh: '下停丰厚：晚年安稳，得下属与后辈之力。', en: 'long: settled later years, with help from those who come after.' },
    short: { zh: '下停偏短：晚年宜早做打算，不倚人手。', en: 'short: plan the later years early rather than relying on others.' },
    even: { zh: '下停匀称：晚景平和。', en: 'even: a calm close.' },
  },
}

export const FACE_PALACE_TEXT: Record<FacePalace, { zh: string; en: string; generous: { zh: string; en: string }; narrow: { zh: string; en: string } }> = {
  命宫: {
    zh: '命宫（两眉之间）',
    en: 'the Life palace, between the brows',
    generous: { zh: '命宫开阔：心量大，不易钻牛角尖。', en: 'wide: a large outlook, not easily caught in a knot.' },
    narrow: { zh: '命宫紧窄：心思专注，也容易积压。', en: 'narrow: intensely focused, and apt to bottle things up.' },
  },
  官禄宫: {
    zh: '官禄宫（额中）',
    en: 'the Career palace, the middle of the forehead',
    generous: { zh: '官禄宫饱满：名位可期，宜在有规矩之处发展。', en: 'full: standing is within reach; structured work suits you.' },
    narrow: { zh: '官禄宫偏窄：不走仕途也罢，自立门户更自在。', en: 'modest: rank matters less than independence.' },
  },
  田宅宫: {
    zh: '田宅宫（眉眼之间）',
    en: 'the Property palace, between brow and eyelid',
    generous: { zh: '田宅宫宽厚：居处安稳，与家宅有缘。', en: 'broad: a settled home, and luck with places to live.' },
    narrow: { zh: '田宅宫窄薄：搬迁频繁，安身之处要自己经营。', en: 'shallow: frequent moves; a home is something you build.' },
  },
  疾厄宫: {
    zh: '疾厄宫（山根）',
    en: 'the Health palace, the bridge of the nose',
    generous: { zh: '山根挺立：底气足，恢复得快。', en: 'strong: good reserves, and quick to recover.' },
    narrow: { zh: '山根低陷：宜顾作息，勿勉强久耗。', en: 'low: look after rest; do not run on empty.' },
  },
  财帛宫: {
    zh: '财帛宫（鼻）',
    en: 'the Wealth palace, the nose',
    generous: { zh: '鼻宽有肉：聚财有力，开销也大方。', en: 'broad: money gathers, and is spent generously too.' },
    narrow: { zh: '鼻形秀窄：进财精细，宜稳不宜赌。', en: 'fine: money comes precisely; steadiness beats gambling.' },
  },
  兄弟宫: {
    zh: '兄弟宫（眉）',
    en: 'the Siblings palace, the brows',
    generous: { zh: '眉长过目：手足朋友多助，人缘宽。', en: 'long: plenty of help from friends and family.' },
    narrow: { zh: '眉短于目：交友精而不广，凡事靠己。', en: 'short: few but chosen friends; much is done alone.' },
  },
  夫妻宫: {
    zh: '夫妻宫（奸门，太阳穴）',
    en: 'the Marriage palace, at the temples',
    generous: { zh: '奸门丰润：感情有依托，相处宽和。', en: 'full: partnership has something to rest on, and runs gently.' },
    narrow: { zh: '奸门凹陷：感情需要经营，忌急于定论。', en: 'hollow: partnership needs tending; do not conclude too fast.' },
  },
  奴仆宫: {
    zh: '奴仆宫（地阁两腮）',
    en: 'the Support palace, along the jaw',
    generous: { zh: '地阁方圆：得下属与后辈拥戴，晚运厚。', en: 'broad: loyalty from those who work with you, and a solid later life.' },
    narrow: { zh: '地阁削薄：凡事亲力亲为，少假手他人。', en: 'slight: you do things yourself rather than delegate.' },
  },
}

export function symmetryText(symmetry: number, language: 'zh' | 'en'): string {
  if (symmetry >= 0.94) {
    return language === 'zh' ? `左右对称度 ${symmetry}：面相端正，行事有定见。` : `Symmetry ${symmetry}: an even face, and a settled way of deciding.`
  }
  if (symmetry <= 0.85) {
    return language === 'zh'
      ? `左右对称度 ${symmetry}：两侧差异明显，性情有两面，能刚能柔。`
      : `Symmetry ${symmetry}: the two sides differ, which is read as two sides to the temperament, firm and yielding by turns.`
  }
  return language === 'zh' ? `左右对称度 ${symmetry}：略有差异，属常见之相。` : `Symmetry ${symmetry}: a slight difference, which is the common case.`
}

export function proportionText(features: FaceFeatures, language: 'zh' | 'en'): string {
  const acrossIdeal = Math.abs(features.eyesAcross - 5) <= 0.5
  const gapIdeal = Math.abs(features.eyeGap - 1) <= 0.15
  if (language === 'zh') {
    return [
      `五眼：面宽约 ${features.eyesAcross} 只眼${acrossIdeal ? '，合于五眼之度' : features.eyesAcross > 5 ? '，面偏阔，气量宽而不拘' : '，面偏窄，专注而内敛'}。`,
      `两眼之间约 ${features.eyeGap} 只眼${gapIdeal ? '，间距得宜' : features.eyeGap > 1 ? '，眼距较宽，心思开阔不记仇' : '，眼距较近，专注而认真'}。`,
    ].join('')
  }
  return [
    `Five eyes: the face is about ${features.eyesAcross} eye-widths across${acrossIdeal ? ', which matches the classical rule' : features.eyesAcross > 5 ? ', a broad face, read as generous and unconfined' : ', a narrow face, read as focused and inward'}.`,
    ` The eyes sit about ${features.eyeGap} eye-widths apart${gapIdeal ? ', which is the ideal' : features.eyeGap > 1 ? ', set wide, read as open and slow to hold a grudge' : ', set close, read as focused and earnest'}.`,
  ].join('')
}

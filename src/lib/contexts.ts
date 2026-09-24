import { BODY_TEXT, formatDegree, SIGNS, type NatalChart, type Transit, type Placement } from '../engines/astrology/astrology'
import { ELEMENT_EN, TEN_GOD_EN, type BaziChart } from '../engines/bazi/bazi'
import { DIRECTION_TEXT, GUA_EN, type EightMansions } from '../engines/fengshui/fengshui'
import { judgeActivity, luckyHours, STANDING_TEXT, VERDICT_TEXT, type Activity, type AlmanacDay } from '../engines/almanac/almanac'
import { linePositionText, type IChingCast } from '../engines/iching/cast'
import { COURT_TEXT, ELEMENT_TEXT, FACE_PALACE_TEXT, proportionText, symmetryText, type FaceFeatures } from '../engines/face/face'
import { FINGER_TEXT, LINE_TEXT, opennessText, PALACE_TEXT, SHAPE_TEXT, thumbAngleText, type PalmFeatures } from '../engines/palm/palm'
import type { Opening } from '../engines/answers/answers'
import { methodNote } from './references'
import type { ReadingLanguage } from '../types'

/**
 * Structured contexts for every practice besides Tarot (which lives in
 * reading.ts). Each context is exactly what the model may know; each offline
 * composer turns the same context into a reading with no model at all.
 */

const LANGUAGE_NAME: Record<ReadingLanguage, string> = { en: 'English', 'zh-Hans': 'Simplified Chinese (简体中文)' }

/**
 * The instructions every practice shares. They exist to make a small model
 * behave: it must work from the computed facts, name them as it goes, and
 * answer the question that was actually asked rather than drifting into
 * generalities, which is what an unguided model does with a subject like this.
 */
function common(language: ReadingLanguage, role: string): string[] {
  return [
    `You are LazyOracle, ${role}.`,
    'You receive a JSON object computed by a deterministic engine. Interpret only what it contains; never recompute, add or contradict a listed fact.',
    `Write in ${LANGUAGE_NAME[language]}, in clear everyday prose. Explain unfamiliar terms briefly. Occasional useful traditional terms are fine, but do not repeatedly mix languages or duplicate translations. No headings, no emoji.`,
    'Name the specific facts as you use them, so the reader can see where each statement comes from. Every paragraph must rest on at least one listed fact.',
    'If a question was asked, answer that question directly in the first two sentences and return to it at the end. If none was asked, read the whole picture instead of inventing a concern.',
    'Prefer one concrete observation to three vague ones. Never pad, never repeat a fact in different words, and do not list what you are about to say before saying it.',
    'Tone: warm, specific, non-deterministic ("this suggests", "a good season for"). No medical, legal or financial promises, no claims about lifespan, illness, pregnancy or death. Do not mention that you are an AI or that this is JSON.',
  ]
}

// ---------- I Ching ----------

export interface IChingContext {
  practice: 'iching'
  language: ReadingLanguage
  question: string
  method: string
  seed: number
  lineVersesAvailable: false
  readingFocus: { kind: string; from: string; positions: number[]; rule: string }
  primary: { number: number; name: string; judgement: string; keywords: string[]; sense: string; lower: string; upper: string }
  changingLines: { position: number; meaning: string }[]
  resulting: { number: number; name: string; judgement: string; keywords: string[]; sense: string; lower: string; upper: string } | null
  /** 互卦, 错卦, 综卦: what is hidden inside, its counterpart, and the other side's view. */
  related: { nuclear: string; opposite: string; inverse: string }
  /** Where the answer is read, by the classical rule. */
  focus: string
}

export function ichingContext(cast: IChingCast, language: ReadingLanguage): IChingContext {
  const l = language === 'en' ? 'en' : 'zh'
  const name = (h: IChingCast['primary']) => (l === 'en' ? `${h.name.zh} ${h.name.pinyin} · ${h.name.en}` : `${h.name.zh}（${h.name.en}）`)
  return {
    practice: 'iching',
    language,
    question: cast.question,
    method: cast.method,
    seed: cast.seed,
    lineVersesAvailable: false,
    readingFocus: { kind: cast.focus.kind, from: cast.focus.from, positions: cast.focus.positions, rule: cast.focus.rule[l] },
    primary: {
      number: cast.primary.number,
      name: name(cast.primary),
      judgement: cast.primary.judgement,
      keywords: cast.primary.keywords[l],
      sense: cast.primary.sense[l],
      lower: cast.primary.lowerTrigram.name[l],
      upper: cast.primary.upperTrigram.name[l],
    },
    changingLines: cast.changingPositions.map((position) => ({ position, meaning: linePositionText(position, l) })),
    resulting: cast.resulting ? { number: cast.resulting.number, name: name(cast.resulting), judgement: cast.resulting.judgement, keywords: cast.resulting.keywords[l], sense: cast.resulting.sense[l], lower: cast.resulting.lowerTrigram.name[l], upper: cast.resulting.upperTrigram.name[l] } : null,
    related: {
      nuclear: `${cast.nuclear.number} ${name(cast.nuclear)}`,
      opposite: `${cast.opposite.number} ${name(cast.opposite)}`,
      inverse: `${cast.inverse.number} ${name(cast.inverse)}`,
    },
    focus: cast.focus.rule[l],
  }
}

export function ichingSystemPrompt(language: ReadingLanguage): string {
  return [
    ...common(language, 'a calm reader of the I Ching (周易)'),
    ...methodNote('iching', language),
    'Structure: name the primary hexagram and quote its judgement; explain its sense for the question; say where the answer is read, following the rule given in the facts, and read it there; then each changing line by position; then, if there is a resulting hexagram, what the situation is moving toward; mention the nuclear hexagram once, as what lies inside the situation; finish with two or three sentences of practical advice.',
    'Follow the reading rule in the facts exactly. Use readingFocus.positions in their supplied priority order from readingFocus.from; these are not necessarily the changing lines. Never infer still lines from yin/yang. Do not move the answer to a different line. Changing-line meanings here describe positions, not individual classical line verses. If the verse needed by the rule is absent, say that limitation briefly; never invent or misquote it.',
    'Length: 220 to 380 words.',
  ].join('\n')
}

export function ichingOffline(c: IChingContext): string {
  if (c.language === 'en') {
    const parts = [`Hexagram ${c.primary.number}, ${c.primary.name}: ${c.primary.upper} over ${c.primary.lower}. The judgement reads "${c.primary.judgement}". ${c.primary.sense} Keywords: ${c.primary.keywords.join(', ')}.`]
    if (c.changingLines.length) parts.push(`Changing lines: ${c.changingLines.map((line) => line.meaning).join(' ')}`)
    else parts.push('No line changes: the situation is stable; read the judgement as it stands.')
    if (c.resulting) parts.push(`It moves toward hexagram ${c.resulting.number}, ${c.resulting.name}: ${c.resulting.sense} Keywords: ${c.resulting.keywords.join(', ')}.`)
    parts.push(`Where to read the answer: ${c.focus}`)
    parts.push(`Inside it lies hexagram ${c.related.nuclear}; its counterpart is ${c.related.opposite}; seen from the other side it is ${c.related.inverse}.`)
    parts.push('Hold the question next to the judgement, then next to the moving lines. Where they agree is your answer; where they differ is what still needs deciding.')
    return parts.join('\n\n')
  }
  const parts = [`第${c.primary.number}卦 ${c.primary.name}：${c.primary.upper}上${c.primary.lower}下。卦辞：“${c.primary.judgement}” ${c.primary.sense} 关键词：${c.primary.keywords.join('、')}。`]
  if (c.changingLines.length) parts.push(`变爻：${c.changingLines.map((line) => line.meaning).join(' ')}`)
  else parts.push('无变爻：局面平稳，以本卦卦辞为断。')
  if (c.resulting) parts.push(`之卦为第${c.resulting.number}卦 ${c.resulting.name}：${c.resulting.sense} 关键词：${c.resulting.keywords.join('、')}。`)
  parts.push(`断法：${c.focus}`)
  parts.push(`互卦为第${c.related.nuclear}卦，错卦为第${c.related.opposite}卦，综卦为第${c.related.inverse}卦。`)
  parts.push('把问题先对照卦辞，再对照变爻。两者相合之处便是答案；相异之处，正是你还需要决定的。')
  return parts.join('\n\n')
}

// ---------- BaZi ----------

export interface BaziContext {
  practice: 'bazi'
  language: ReadingLanguage
  question: string
  pillars: { year: string; month: string; day: string; hour: string; hourKnown: boolean }
  dayMaster: string
  tenGods: { year: string; month: string; hour: string }
  hiddenStems: string[]
  elements: Record<string, number>
  strength: string
  favourable: string[]
  luckCycles: string[]
  currentYear: string
  solarTerms: string
}

export function baziContext(chart: BaziChart, language: ReadingLanguage, question: string, hourKnown: boolean): BaziContext {
  const en = language === 'en'
  const el = (e: string) => (en ? ELEMENT_EN[e] : e)
  const god = (g: string) => (en ? `${g} (${TEN_GOD_EN[g] ?? g})` : g)
  const { year, month, day, hour } = chart.pillars
  return {
    practice: 'bazi',
    language,
    question,
    pillars: { year: year.ganzhi, month: month.ganzhi, day: day.ganzhi, hour: hour.ganzhi, hourKnown },
    dayMaster: en
      ? `${chart.dayMaster.stem} (${chart.dayMaster.yinYang === '阳' ? 'yang' : 'yin'} ${ELEMENT_EN[chart.dayMaster.element]})`
      : `${chart.dayMaster.stem}（${chart.dayMaster.yinYang}${chart.dayMaster.element}）`,
    tenGods: { year: god(year.stemGod), month: god(month.stemGod), hour: god(hour.stemGod) },
    hiddenStems: [year, month, day, hour].flatMap((p) => p.hiddenStems.map((h) => `${p.branch}: ${h.stem} ${god(h.god)}`)),
    elements: Object.fromEntries(Object.entries(chart.elements).map(([k, v]) => [el(k), v])),
    strength: en ? chart.strength : { strong: '身强', balanced: '中和', weak: '身弱' }[chart.strength],
    favourable: chart.favourable.map(el),
    luckCycles: chart.luckCycles.map((c) => `${c.ganzhi} ${c.startYear}–${c.endYear}`),
    currentYear: `${chart.currentYear.year} ${chart.currentYear.ganzhi} ${god(chart.currentYear.god)}`,
    solarTerms: `${chart.lunar.jieQiBefore} → ${chart.lunar.jieQiAfter}`,
  }
}

export function baziSystemPrompt(language: ReadingLanguage): string {
  return [
    ...common(language, 'an experienced but gentle BaZi (四柱八字) reader'),
    ...methodNote('bazi', language),
    'Structure: describe the day master and the season it was born in; the balance of the five elements and what "strength" means here; the ten gods present and what they suggest about work, relationships and resources; the current luck cycle and this year; then three practical suggestions. If hourKnown is false, say the hour pillar is approximate.',
    'Never invent pillars or gods that are not listed. Length: 250 to 400 words.',
  ].join('\n')
}

export function baziOffline(c: BaziContext): string {
  const en = c.language === 'en'
  const elements = Object.entries(c.elements).map(([k, v]) => `${k} ${v}`).join(en ? ', ' : '，')
  if (en) {
    return [
      `Four pillars: year ${c.pillars.year}, month ${c.pillars.month}, day ${c.pillars.day}, hour ${c.pillars.hour}${c.pillars.hourKnown ? '' : ' (approximate)'}. Day master ${c.dayMaster}, born between the solar terms ${c.solarTerms}.`,
      `Five elements: ${elements}. The day master reads as ${c.strength}; favourable elements are ${c.favourable.join(' and ')}.`,
      `Ten gods on the stems: year ${c.tenGods.year}, month ${c.tenGods.month}, hour ${c.tenGods.hour}. Hidden stems: ${c.hiddenStems.join('; ')}.`,
      `Luck cycles: ${c.luckCycles.join(' · ')}. This year: ${c.currentYear}.`,
      'Read the favourable elements as the colours, directions and kinds of work that steady you, and the ten gods as the roles you tend to play. The current cycle shows which of those roles the decade is asking for.',
    ].join('\n\n')
  }
  return [
    `四柱：年柱 ${c.pillars.year}，月柱 ${c.pillars.month}，日柱 ${c.pillars.day}，时柱 ${c.pillars.hour}${c.pillars.hourKnown ? '' : '（时辰不确定，仅供参考）'}。日主 ${c.dayMaster}，生于节气 ${c.solarTerms} 之间。`,
    `五行：${elements}。日主${c.strength}；喜用 ${c.favourable.join('、')}。`,
    `天干十神：年 ${c.tenGods.year}，月 ${c.tenGods.month}，时 ${c.tenGods.hour}。地支藏干：${c.hiddenStems.join('；')}。`,
    `大运：${c.luckCycles.join(' · ')}。流年：${c.currentYear}。`,
    '把喜用五行看作让你安稳的颜色、方位与行业，把十神看作你习惯扮演的角色。当前大运，正说明这十年在向你要哪一种角色。',
  ].join('\n\n')
}

// ---------- Astrology ----------

export interface AstrologyContext {
  practice: 'astrology'
  language: ReadingLanguage
  question: string
  ascendant: string
  midheaven: string
  placements: { body: string; sign: string; degree: string; house: number; retrograde: boolean }[]
  aspects: string[]
  today: { date: string; transits: string[] }
}

const ASPECT_TEXT: Record<string, { en: string; zh: string }> = {
  conjunction: { en: 'conjunct', zh: '合相' },
  opposition: { en: 'opposite', zh: '对分' },
  trine: { en: 'trine', zh: '三分' },
  square: { en: 'square', zh: '四分' },
  sextile: { en: 'sextile', zh: '六分' },
}

function bodyName(body: Placement['body'], en: boolean): string {
  return en ? body : BODY_TEXT[body].zh
}

export function astrologyContext(chart: NatalChart, transits: Transit[], language: ReadingLanguage, question: string, today: Date): AstrologyContext {
  const en = language === 'en'
  const sign = (index: number) => (en ? SIGNS[index].en : SIGNS[index].zh)
  return {
    practice: 'astrology',
    language,
    question,
    ascendant: `${sign(Math.floor(chart.ascendant / 30))} ${formatDegree(chart.ascendant)}`,
    midheaven: `${sign(Math.floor(chart.midheaven / 30))} ${formatDegree(chart.midheaven)}`,
    placements: chart.placements.map((p) => ({ body: bodyName(p.body, en), sign: sign(p.sign), degree: formatDegree(p.longitude), house: p.house, retrograde: p.retrograde })),
    aspects: chart.aspects.map((a) => `${bodyName(a.a, en)} ${ASPECT_TEXT[a.type][en ? 'en' : 'zh']} ${bodyName(a.b, en)} (${a.orb}°)`),
    today: {
      date: today.toISOString().slice(0, 10),
      transits: transits.map((t) => `${en ? 'transiting' : '行运'}${en ? ' ' : ''}${bodyName(t.transiting, en)} ${ASPECT_TEXT[t.type][en ? 'en' : 'zh']} ${en ? 'natal' : '本命'}${en ? ' ' : ''}${bodyName(t.natal, en)} (${t.orb}°)`),
    },
  }
}

export function astrologySystemPrompt(language: ReadingLanguage): string {
  return [
    ...common(language, 'a thoughtful astrologer working with a tropical, whole-sign natal chart'),
    ...methodNote('astrology', language),
    'Structure: the Sun, Moon and Ascendant as the core of the chart; two or three notable placements or aspects that bear on the question; then today\'s transits and what kind of day they suggest; finish with gentle advice.',
    'Length: 250 to 400 words.',
  ].join('\n')
}

export function astrologyOffline(c: AstrologyContext): string {
  const en = c.language === 'en'
  const core = c.placements.filter((p) => ['Sun', 'Moon', '太阳', '月亮'].includes(p.body))
  const others = c.placements.filter((p) => !core.includes(p))
  if (en) {
    return [
      `Ascendant ${c.ascendant}; Midheaven ${c.midheaven}. ${core.map((p) => `${p.body} in ${p.sign}, house ${p.house}`).join('; ')}.`,
      `Other placements: ${others.map((p) => `${p.body} ${p.sign} (house ${p.house}${p.retrograde ? ', retrograde' : ''})`).join('; ')}.`,
      `Aspects: ${c.aspects.length ? c.aspects.join('; ') : 'none within orb'}.`,
      `Today, ${c.today.date}: ${c.today.transits.length ? c.today.transits.join('; ') : 'no close transits to natal planets'}.`,
      'The Sun is what you are becoming, the Moon what you need, the Ascendant how you begin things. Today\'s transits colour which of these is loudest.',
    ].join('\n\n')
  }
  return [
    `上升 ${c.ascendant}；天顶 ${c.midheaven}。${core.map((p) => `${p.body}落${p.sign}，第${p.house}宫`).join('；')}。`,
    `其他行星：${others.map((p) => `${p.body} ${p.sign}（第${p.house}宫${p.retrograde ? '，逆行' : ''}）`).join('；')}。`,
    `相位：${c.aspects.length ? c.aspects.join('；') : '容许度内无相位'}。`,
    `今日 ${c.today.date}：${c.today.transits.length ? c.today.transits.join('；') : '与本命行星无紧密行运'}。`,
    '太阳是你正在成为的样子，月亮是你的需要，上升是你开始事情的方式。今日的行运决定了三者中哪一个声音最大。',
  ].join('\n\n')
}

// ---------- Feng Shui ----------

export interface FengShuiContext {
  practice: 'fengshui'
  language: ReadingLanguage
  question: string
  gua: string
  group: string
  sectors: { direction: string; quality: string; auspicious: boolean; use: string }[]
  facing: string | null
}

export function fengshuiContext(m: EightMansions, language: ReadingLanguage, question: string, facing: string | null): FengShuiContext {
  const en = language === 'en'
  return {
    practice: 'fengshui',
    language,
    question,
    gua: en ? `${m.gua} ${GUA_EN[m.gua]} (number ${m.guaNumber}, ${m.year})` : `${m.gua}命（${m.guaNumber}，${m.year}年）`,
    group: en ? (m.group === 'east' ? 'East group' : 'West group') : m.group === 'east' ? '东四命' : '西四命',
    sectors: m.sectors.map((s) => ({ direction: DIRECTION_TEXT[s.direction][en ? 'en' : 'zh'], quality: s.quality.name[en ? 'en' : 'zh'], auspicious: s.quality.auspicious, use: s.quality.use[en ? 'en' : 'zh'] })),
    facing,
  }
}

export function fengshuiSystemPrompt(language: ReadingLanguage): string {
  return [
    ...common(language, 'a practical Eight Mansions (八宅) feng shui consultant'),
    ...methodNote('fengshui', language),
    'Structure: explain the personal trigram and group in one paragraph; then which directions suit the main door, bed, desk and stove and which to avoid, citing the listed sectors; if a facing direction is given, comment on it; finish with three easy adjustments that need no renovation.',
    'Length: 200 to 350 words.',
  ].join('\n')
}

export function fengshuiOffline(c: FengShuiContext): string {
  const good = c.sectors.filter((s) => s.auspicious)
  const bad = c.sectors.filter((s) => !s.auspicious)
  if (c.language === 'en') {
    return [
      `Personal trigram ${c.gua}, ${c.group}.`,
      `Favourable directions: ${good.map((s) => `${s.direction} (${s.quality}: ${s.use})`).join('; ')}.`,
      `Directions to avoid for long stays: ${bad.map((s) => `${s.direction} (${s.quality}: ${s.use})`).join('; ')}.`,
      c.facing ? `Your door or bed currently faces ${c.facing}.` : 'Point the phone at your door or bed to check its direction.',
      'Small changes count: turn the desk to face a good direction, move the bed head toward Health, and put storage in the sectors to avoid.',
    ].join('\n\n')
  }
  return [
    `${c.gua}，${c.group}。`,
    `吉方：${good.map((s) => `${s.direction}（${s.quality}：${s.use}）`).join('；')}。`,
    `凶方：${bad.map((s) => `${s.direction}（${s.quality}：${s.use}）`).join('；')}。`,
    c.facing ? `你当前朝向 ${c.facing}。` : '把手机对准门或床头，可以测出朝向。',
    '小调整也有用：书桌朝吉方，床头朝天医，杂物和储物放在凶方。',
  ].join('\n\n')
}

// ---------- Palm ----------

export interface PalmContext {
  practice: 'palm'
  language: ReadingLanguage
  question: string
  shape: string
  shapeKeywords: string[]
  proportions: { fingerRatio: number; palmRatio: number; indexToRing: number }
  lines: string[]
  /** Finger lengths against the middle finger, only the notable ones. */
  fingers: string[]
  /** The palaces that stand out or are notably flat. */
  palaces: string[]
  /** Thumb opening and how widely the fingers are held. */
  hand: string[]
}

export function palmContext(f: PalmFeatures, language: ReadingLanguage, question: string): PalmContext {
  const l = language === 'en' ? 'en' : 'zh'
  const fingers = f.fingers
    .filter((finger) => finger.length !== 'average')
    .map((finger) => `${FINGER_TEXT[finger.finger][l]}: ${FINGER_TEXT[finger.finger][finger.length === 'long' ? 'long' : 'short'][l]}`)
  const palaces = f.palaces
    .filter((palace) => palace.state !== 'even')
    .map((palace) => `${PALACE_TEXT[palace.palace][l]} — ${PALACE_TEXT[palace.palace][palace.state === 'full' ? 'full' : 'flat'][l]}`)
  return {
    practice: 'palm',
    language,
    question,
    shape: SHAPE_TEXT[f.shape][l],
    shapeKeywords: SHAPE_TEXT[f.shape].keywords[l],
    proportions: { fingerRatio: Math.round(f.fingerRatio * 100) / 100, palmRatio: Math.round(f.palmRatio * 100) / 100, indexToRing: Math.round(f.indexToRing * 100) / 100 },
    lines: [LINE_TEXT.heart[f.lines.heart][l], LINE_TEXT.head[f.lines.head][l], LINE_TEXT.life[f.lines.life][l], LINE_TEXT.fate[f.lines.fate][l]],
    fingers,
    palaces,
    hand: [thumbAngleText(f.thumbAngle, l), opennessText(f.openness, l)],
  }
}

export function palmSystemPrompt(language: ReadingLanguage): string {
  return [
    ...common(language, 'a friendly palm reader who treats palmistry as a mirror for reflection, not prediction'),
    ...methodNote('palm', language),
    'Structure: the hand shape and what its keywords suggest; the three major lines and the fate line in turn; the fingers and the palaces that stand out, named as the facts name them; how all of it combines; two sentences of encouragement. Say once, lightly, that this is for reflection.',
    'Use only the facts given. Do not invent a line, a finger or a palace that is not listed.',
    'Length: 220 to 360 words.',
  ].join('\n')
}

export function palmOffline(c: PalmContext): string {
  const parts: string[] = []
  if (c.language === 'en') {
    parts.push(`${c.shape}: ${c.shapeKeywords.join(', ')}.`)
    parts.push(c.lines.join(' '))
    if (c.fingers.length) parts.push(`Fingers: ${c.fingers.join(' ')}`)
    if (c.palaces.length) parts.push(`Palaces: ${c.palaces.join(' ')}`)
    parts.push(c.hand.join(' '))
    parts.push(`Finger-to-palm ratio ${c.proportions.fingerRatio}, palm width ratio ${c.proportions.palmRatio}, index-to-ring ${c.proportions.indexToRing}.`)
    parts.push('Read the shape as your default pace, the lines as the habits you have grown into, and the palaces as where your energy collects. Palmistry is a mirror to think with, not a forecast.')
    return parts.join('\n\n')
  }
  parts.push(`${c.shape}：${c.shapeKeywords.join('、')}。`)
  parts.push(c.lines.join(' '))
  if (c.fingers.length) parts.push(`五指：${c.fingers.join(' ')}`)
  if (c.palaces.length) parts.push(`八宫：${c.palaces.join(' ')}`)
  parts.push(c.hand.join(' '))
  parts.push(`指长比 ${c.proportions.fingerRatio}，掌宽比 ${c.proportions.palmRatio}，食指/无名指 ${c.proportions.indexToRing}。`)
  parts.push('手型是你的默认节奏，纹路是你养成的习惯，八宫是气力聚集之处。手相是一面用来思考的镜子，不是预告。')
  return parts.join('\n\n')
}

// ---------- Face reading ----------

export interface FaceContext {
  practice: 'face'
  language: ReadingLanguage
  question: string
  /** 五行面型 and its keywords. */
  element: string
  elementKeywords: string[]
  /** 三停, each with its share of the face's height. */
  courts: string[]
  /** 五眼 and the spacing of the eyes. */
  proportions: string
  symmetry: string
  /** The palaces that are generous or narrow; the even ones are left out. */
  palaces: string[]
}

export function faceContext(f: FaceFeatures, language: ReadingLanguage, question: string): FaceContext {
  const l = language === 'en' ? 'en' : 'zh'
  return {
    practice: 'face',
    language,
    question,
    element: ELEMENT_TEXT[f.element][l],
    elementKeywords: ELEMENT_TEXT[f.element].keywords[l],
    courts: f.courts.map((court) => `${COURT_TEXT[court.court][l]} ${Math.round(court.share * 100)}% — ${COURT_TEXT[court.court][court.state === 'long' ? 'long' : court.state === 'short' ? 'short' : 'even'][l]}`),
    proportions: proportionText(f, l),
    symmetry: symmetryText(f.symmetry, l),
    palaces: f.palaces
      .filter((palace) => palace.state !== 'even')
      .map((palace) => `${FACE_PALACE_TEXT[palace.palace][l]} ${palace.value} — ${FACE_PALACE_TEXT[palace.palace][palace.state === 'generous' ? 'generous' : 'narrow'][l]}`),
  }
}

export function faceSystemPrompt(language: ReadingLanguage): string {
  return [
    ...common(language, 'a reader of Chinese physiognomy (面相) who treats a face as a portrait of habits, not a verdict'),
    ...methodNote('face', language),
    'Structure: the elemental face type and what it suggests; the three courts and what each period of life is said to carry; the proportions and symmetry; then the palaces that stand out, named as the facts name them; finish with two or three sentences the reader can act on.',
    'Use only the measurements given, and quote a ratio when it supports a point. Never comment on beauty, health, race or worth, and never predict illness or death.',
    'Say once, lightly, that a face is read here as a mirror for reflection.',
    'Length: 220 to 360 words.',
  ].join('\n')
}

export function faceOffline(c: FaceContext): string {
  const parts: string[] = []
  if (c.language === 'en') {
    parts.push(`${c.element}: ${c.elementKeywords.join(', ')}.`)
    parts.push(c.courts.join(' '))
    parts.push(`${c.proportions} ${c.symmetry}`)
    if (c.palaces.length) parts.push(`Palaces: ${c.palaces.join(' ')}`)
    parts.push('The three courts are read as the early, middle and later parts of a life, and the palaces as where attention collects. A face is a mirror to think with, not a verdict.')
    return parts.join('\n\n')
  }
  parts.push(`${c.element}：${c.elementKeywords.join('、')}。`)
  parts.push(c.courts.join(' '))
  parts.push(`${c.proportions}${c.symmetry}`)
  if (c.palaces.length) parts.push(`十二宫：${c.palaces.join(' ')}`)
  parts.push('三停分主早年、中年与晚年，十二宫是心力聚集之处。面相是一面用来思考的镜子，不是定论。')
  return parts.join('\n\n')
}

// ---------- Almanac ----------

export interface AlmanacContext {
  practice: 'almanac'
  language: ReadingLanguage
  question: string
  date: string
  lunar: string
  ganzhi: string
  solarTerm: string | null
  /** What the day is held to suit, and to avoid, in the almanac's own words. */
  yi: string[]
  ji: string[]
  clash: string
  harmDirection: string
  dayOfficer: string
  mansion: string
  spirit: string
  standing: string
  luckyHours: string[]
  /** The undertaking asked about, and what the almanac says about it. */
  asked: { activity: string; verdict: string; basis: string } | null
}

export function almanacContext(day: AlmanacDay, activity: Activity | null, language: ReadingLanguage, question: string): AlmanacContext {
  const l = language === 'en' ? 'en' : 'zh'
  const judgement = activity ? judgeActivity(day, activity) : null
  return {
    practice: 'almanac',
    language,
    question,
    date: day.date,
    lunar: `${day.lunar.text}（${day.lunar.yearGanZhi}年 ${day.lunar.zodiac}）`,
    ganzhi: `${day.lunar.yearGanZhi} ${day.lunar.monthGanZhi} ${day.lunar.dayGanZhi}`,
    solarTerm: day.solarTerm,
    yi: day.yi,
    ji: day.ji,
    clash: day.clash,
    harmDirection: day.harmDirection,
    dayOfficer: day.dayOfficer,
    mansion: `${day.mansion.name}（${day.mansion.animal}·${day.mansion.direction}·${day.mansion.beast}）`,
    spirit: `${day.spirit.name}·${day.spirit.road}·${day.spirit.luck}`,
    standing: STANDING_TEXT[day.standing][l],
    luckyHours: luckyHours(day).map((hour) => `${hour.ganzhi} ${hour.range} ${hour.spirit}`),
    asked: activity && judgement ? { activity: activity.name[l], verdict: VERDICT_TEXT[judgement.verdict][l], basis: judgement.basis[l] } : null,
  }
}

export function almanacSystemPrompt(language: ReadingLanguage): string {
  return [
    ...common(language, "a reader of the Chinese almanac (黄历), who quotes the day's own words rather than improvising"),
    ...methodNote('almanac', language),
    'Structure: answer the undertaking asked about in the first sentence, quoting the almanac word that decides it; then the day itself, its officer, spirit and mansion; then the favourable hours; then one practical sentence.',
    'Never add an undertaking to 宜 or 忌 that the facts do not list.',
    'Length: 120 to 220 words.',
  ].join('\n')
}

export function almanacOffline(c: AlmanacContext): string {
  const parts: string[] = []
  if (c.language === 'en') {
    if (c.asked) parts.push(`${c.asked.activity}: ${c.asked.verdict}. ${c.asked.basis}`)
    parts.push(`${c.date}, ${c.lunar}. Pillars ${c.ganzhi}${c.solarTerm ? `, solar term ${c.solarTerm}` : ''}.`)
    parts.push(`Suitable: ${c.yi.join(', ') || 'nothing listed'}. To avoid: ${c.ji.join(', ') || 'nothing listed'}.`)
    parts.push(`Day officer ${c.dayOfficer}, spirit ${c.spirit}, mansion ${c.mansion}. The day clashes with ${c.clash}, harm to the ${c.harmDirection}. Overall ${c.standing}.`)
    if (c.luckyHours.length) parts.push(`Favourable hours: ${c.luckyHours.join('; ')}.`)
    parts.push('The almanac is custom rather than prediction: it is a way of choosing a time, not a forecast of what will happen.')
    return parts.join('\n\n')
  }
  if (c.asked) parts.push(`${c.asked.activity}：${c.asked.verdict}。${c.asked.basis}`)
  parts.push(`${c.date} ${c.lunar}。${c.ganzhi}${c.solarTerm ? `，${c.solarTerm}` : ''}。`)
  parts.push(`宜：${c.yi.join('、') || '（无）'}。忌：${c.ji.join('、') || '（无）'}。`)
  parts.push(`建除「${c.dayOfficer}」，值神 ${c.spirit}，宿 ${c.mansion}。冲${c.clash}，煞${c.harmDirection}。整体${c.standing}。`)
  if (c.luckyHours.length) parts.push(`吉时：${c.luckyHours.join('；')}。`)
  parts.push('黄历是择日的民俗，不是预测：它帮你挑时间，不预告结果。')
  return parts.join('\n\n')
}

// ---------- Books ----------

export interface BookContext {
  practice: 'answers'
  language: ReadingLanguage
  book: 'answers' | 'questions'
  question: string
  page: number
  text: string
}

export function bookContext(opening: Opening, language: ReadingLanguage): BookContext {
  return { practice: 'answers', language, book: opening.book, question: opening.question, page: opening.page.number, text: opening.page[language === 'en' ? 'en' : 'zh'] }
}

export function bookSystemPrompt(language: ReadingLanguage): string {
  return [
    ...common(language, 'the quiet voice of a book of answers'),
    ...methodNote('answers', language),
    'The page text is the answer. Write two or three short sentences that connect the page to the question without changing the answer. Do not add a different answer.',
    'Length: under 80 words.',
  ].join('\n')
}

export function bookOffline(c: BookContext): string {
  return c.text
}

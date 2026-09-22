/**
 * The tools behind "问天机 / Ask Tianji".
 *
 * The chat is not a chatbot that talks about divination; it can actually do it.
 * Every practice in the app is exposed here as a tool the model may call, and
 * each tool runs the same deterministic engine the corresponding screen runs,
 * on the device. The model never invents a card, a hexagram or a pillar: it
 * asks for one, receives the computed facts, and reads them.
 *
 * Tools are called through a small text protocol rather than any one
 * provider's function-calling API, so the same conversation works with a
 * downloaded Tianji model and with Tianji Cloud:
 *
 *     <tool>{"name": "draw_tarot", "arguments": {"spread": "three"}}</tool>
 *
 * The loop runs the call, appends the result, and asks the model again, at
 * most `MAX_STEPS` times before it must answer in words.
 */
import { openBook } from '../engines/answers/answers'
import { computeChart, formatDegree, transitsFor, SIGNS } from '../engines/astrology/astrology'
import { computeBazi } from '../engines/bazi/bazi'
import { DIRECTION_TEXT, eightMansions } from '../engines/fengshui/fengshui'
import { castHexagram } from '../engines/iching/cast'
import { drawSpread } from '../engines/tarot/draw'
import { SPREADS } from '../engines/tarot/spreads'
import { loadProfile } from './profile'
import type { ReadingLanguage } from '../types'

export const MAX_STEPS = 6

export interface ToolCall {
  name: string
  arguments: Record<string, unknown>
}

export interface ToolResult {
  call: ToolCall
  /** What the model receives: the computed facts, as compact JSON. */
  output: string
  /** One short line for the reader, e.g. "Drew three cards". */
  label: string
  ok: boolean
}

interface ToolSpec {
  name: string
  /** Shown to the model: what it does and which arguments it takes. */
  usage: { en: string; zh: string }
  run: (args: Record<string, unknown>, language: ReadingLanguage) => { output: unknown; label: { en: string; zh: string } }
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

const NO_PROFILE = {
  en: 'No birth details are saved. Ask the reader for year, month, day, hour and birthplace, or tell them to fill in birth details on any chart screen.',
  zh: '尚未保存出生资料。请向来访者询问出生年月日、时辰与地点，或提示他们在任一排盘页面填写。',
}

export const TOOLS: ToolSpec[] = [
  {
    name: 'draw_tarot',
    usage: {
      en: 'draw_tarot {"spread": "one" | "three" | "celtic", "question": string} — shuffles and draws a real spread. Use it whenever the reader wants cards.',
      zh: 'draw_tarot {"spread": "one" | "three" | "celtic", "question": 字符串} — 真实洗牌并抽牌。来访者想抽牌时使用。',
    },
    run: (args, language) => {
      const spread = (['one', 'three', 'celtic'] as const).find((id) => id === args.spread) ?? 'three'
      const draw = drawSpread(spread, { question: text(args.question) })
      const l = language === 'en' ? 'en' : 'zh'
      return {
        output: {
          spread: SPREADS[spread].name[l],
          seed: draw.seed,
          cards: draw.cards.map((drawn) => {
            const text = drawn.card.text[l]
            return {
              position: drawn.position.name[l],
              card: text.name,
              orientation: drawn.orientation,
              keywords: drawn.orientation === 'reversed' ? text.reversed : text.upright,
            }
          }),
        },
        label: { en: `Drew ${draw.cards.length} card(s), ${SPREADS[spread].name.en}`, zh: `抽了 ${draw.cards.length} 张牌（${SPREADS[spread].name.zh}）` },
      }
    },
  },
  {
    name: 'cast_iching',
    usage: {
      en: 'cast_iching {"method": "coins" | "yarrow", "question": string} — casts a hexagram, with its moving lines, the resulting hexagram and the classical rule for where the answer is read.',
      zh: 'cast_iching {"method": "coins" | "yarrow", "question": 字符串} — 起一卦，含变爻、之卦与断法。',
    },
    run: (args, language) => {
      const method = args.method === 'yarrow' ? 'yarrow' : 'coins'
      const cast = castHexagram({ method, question: text(args.question) })
      const l = language === 'en' ? 'en' : 'zh'
      return {
        output: {
          primary: { number: cast.primary.number, name: cast.primary.name.zh, judgement: cast.primary.judgement, sense: cast.primary.sense[l] },
          changingLines: cast.changingPositions,
          resulting: cast.resulting ? { number: cast.resulting.number, name: cast.resulting.name.zh, sense: cast.resulting.sense[l] } : null,
          nuclear: cast.nuclear.number,
          opposite: cast.opposite.number,
          inverse: cast.inverse.number,
          rule: cast.focus.rule[l],
        },
        label: { en: `Cast hexagram ${cast.primary.number}`, zh: `起卦：第 ${cast.primary.number} 卦` },
      }
    },
  },
  {
    name: 'four_pillars',
    usage: {
      en: 'four_pillars {} — computes the reader\'s BaZi from their saved birth details: pillars, day master, five-element balance, luck cycles.',
      zh: 'four_pillars {} — 依据已保存的出生资料排四柱：四柱、日主、五行强弱与大运。',
    },
    run: (_args, language) => {
      const profile = loadProfile()
      if (!profile) return { output: { error: NO_PROFILE[language === 'en' ? 'en' : 'zh'] }, label: { en: 'No birth details', zh: '缺少出生资料' } }
      const chart = computeBazi({
        year: profile.year,
        month: profile.month,
        day: profile.day,
        hour: profile.timeKnown ? profile.hour : 12,
        minute: profile.timeKnown ? profile.minute : 0,
        gender: profile.gender,
        longitude: profile.longitude,
        utcOffsetHours: profile.utcOffsetHours,
      })
      return {
        output: {
          pillars: Object.fromEntries(Object.entries(chart.pillars).map(([key, pillar]) => [key, `${pillar.ganzhi} (${pillar.stemGod})`])),
          dayMaster: `${chart.dayMaster.stem} ${chart.dayMaster.element}`,
          elements: chart.elements,
          strength: chart.strength,
          favourable: chart.favourable,
          hourKnown: profile.timeKnown,
          currentYear: chart.currentYear,
          nextLuckCycles: chart.luckCycles.slice(0, 3).map((cycle) => `${cycle.ganzhi} ${cycle.startYear}–${cycle.endYear}`),
        },
        label: { en: `Four pillars: ${chart.pillars.day.ganzhi} day master`, zh: `四柱：日主 ${chart.pillars.day.ganzhi}` },
      }
    },
  },
  {
    name: 'natal_chart',
    usage: {
      en: 'natal_chart {} — computes the reader\'s natal placements, ascendant and the transits of today from their saved birth details.',
      zh: 'natal_chart {} — 依据已保存的出生资料计算本命盘、上升与今日行运。',
    },
    run: (_args, language) => {
      const profile = loadProfile()
      if (!profile) return { output: { error: NO_PROFILE[language === 'en' ? 'en' : 'zh'] }, label: { en: 'No birth details', zh: '缺少出生资料' } }
      const chart = computeChart({
        year: profile.year,
        month: profile.month,
        day: profile.day,
        hour: profile.timeKnown ? profile.hour : 12,
        minute: profile.timeKnown ? profile.minute : 0,
        utcOffsetHours: profile.utcOffsetHours,
        latitude: profile.latitude,
        longitude: profile.longitude,
      })
      const { transits } = transitsFor(chart)
      const l = language === 'en' ? 'en' : 'zh'
      return {
        output: {
          ascendant: formatDegree(chart.ascendant),
          placements: chart.placements.map((placement) => `${placement.body} ${formatDegree(placement.longitude)}${placement.retrograde ? ' R' : ''} house ${placement.house}`),
          majorAspects: chart.aspects.slice(0, 6).map((aspect) => `${aspect.a} ${aspect.type} ${aspect.b} (orb ${aspect.orb.toFixed(1)}°)`),
          transitsToday: transits.slice(0, 5).map((transit) => `${transit.transiting} ${transit.type} natal ${transit.natal}`),
          sunSign: SIGNS[Math.floor(chart.placements[0].longitude / 30) % 12][l],
        },
        label: { en: 'Computed the natal chart', zh: '已排出本命盘' },
      }
    },
  },
  {
    name: 'eight_mansions',
    usage: {
      en: 'eight_mansions {} — the reader\'s 命卦 and which of the eight directions are favourable, from their saved birth details.',
      zh: 'eight_mansions {} — 依据出生资料求命卦，并给出八方吉凶。',
    },
    run: (_args, language) => {
      const profile = loadProfile()
      if (!profile) return { output: { error: NO_PROFILE[language === 'en' ? 'en' : 'zh'] }, label: { en: 'No birth details', zh: '缺少出生资料' } }
      const mansions = eightMansions(profile.year, profile.month, profile.day, profile.gender)
      const l = language === 'en' ? 'en' : 'zh'
      return {
        output: {
          gua: mansions.gua,
          group: mansions.group,
          sectors: mansions.sectors.map((sector) => `${DIRECTION_TEXT[sector.direction][l]}: ${sector.quality.name[l]} (${sector.quality.auspicious ? 'favourable' : 'unfavourable'})`),
        },
        label: { en: `Life gua ${mansions.gua}`, zh: `命卦 ${mansions.gua}` },
      }
    },
  },
  {
    name: 'open_book',
    usage: {
      en: 'open_book {"book": "answers" | "questions", "question": string} — opens the Book of Answers or the Book of Questions at one page.',
      zh: 'open_book {"book": "answers" | "questions", "question": 字符串} — 翻开答案之书或问题之书的一页。',
    },
    run: (args, language) => {
      const book = args.book === 'questions' ? 'questions' : 'answers'
      const opening = openBook(book, { question: text(args.question) })
      const l = language === 'en' ? 'en' : 'zh'
      return {
        output: { book, page: opening.page.number, text: opening.page[l] },
        label: { en: `Opened page ${opening.page.number}`, zh: `翻到第 ${opening.page.number} 页` },
      }
    },
  },
  {
    name: 'birth_details',
    usage: {
      en: 'birth_details {} — what the app knows about the reader: birth date, whether the hour is known, and birthplace. Call this before saying you lack information.',
      zh: 'birth_details {} — 应用已知的来访者资料：出生日期、时辰是否已知、出生地。在说「缺少资料」之前先调用它。',
    },
    run: (_args, language) => {
      const profile = loadProfile()
      if (!profile) return { output: { saved: false, note: NO_PROFILE[language === 'en' ? 'en' : 'zh'] }, label: { en: 'No birth details', zh: '缺少出生资料' } }
      return {
        output: {
          saved: true,
          date: `${profile.year}-${String(profile.month).padStart(2, '0')}-${String(profile.day).padStart(2, '0')}`,
          time: profile.timeKnown ? `${String(profile.hour).padStart(2, '0')}:${String(profile.minute).padStart(2, '0')}` : 'unknown',
          place: profile.place || `${profile.latitude}, ${profile.longitude}`,
          gender: profile.gender,
        },
        label: { en: 'Read the birth details', zh: '已读取出生资料' },
      }
    },
  },
  {
    name: 'today',
    usage: {
      en: 'today {} — the current date and the day\'s sexagenary pillar, for questions about timing.',
      zh: 'today {} — 当前日期与当日干支，用于择时类问题。',
    },
    run: () => {
      const now = new Date()
      const chart = computeBazi({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(), hour: now.getHours(), minute: now.getMinutes(), gender: 'female' })
      return {
        output: { date: now.toISOString().slice(0, 10), dayPillar: chart.pillars.day.ganzhi, monthPillar: chart.pillars.month.ganzhi, yearPillar: chart.pillars.year.ganzhi, solarTerm: chart.lunar.jieQiBefore },
        label: { en: `Today is ${chart.pillars.day.ganzhi}`, zh: `今日 ${chart.pillars.day.ganzhi}` },
      }
    },
  },
]

/**
 * The same tools in the shape a provider's function calling expects. Used
 * when the reading service supports it; the text protocol below is the
 * fallback for a model running on the phone.
 */
export function toolSchemas(language: ReadingLanguage): unknown[] {
  const l = language === 'en' ? 'en' : 'zh'
  const shapes: Record<string, { properties: Record<string, unknown>; required?: string[] }> = {
    draw_tarot: {
      properties: {
        spread: { type: 'string', enum: ['one', 'three', 'celtic'], description: 'How many cards: one, three, or the ten-card Celtic Cross.' },
        question: { type: 'string', description: 'The question the cards are drawn for.' },
      },
    },
    cast_iching: {
      properties: {
        method: { type: 'string', enum: ['coins', 'yarrow'], description: 'Three coins, or yarrow stalks.' },
        question: { type: 'string', description: 'The question the hexagram is cast for.' },
      },
    },
    four_pillars: { properties: {} },
    natal_chart: { properties: {} },
    eight_mansions: { properties: {} },
    open_book: {
      properties: {
        book: { type: 'string', enum: ['answers', 'questions'], description: 'Which of the two books to open.' },
        question: { type: 'string', description: 'The question held while opening it.' },
      },
    },
    birth_details: { properties: {} },
    today: { properties: {} },
  }
  return TOOLS.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.usage[l],
      parameters: { type: 'object', properties: shapes[tool.name]?.properties ?? {}, required: shapes[tool.name]?.required ?? [] },
    },
  }))
}

/** The tool instructions appended to the chat's system prompt. */
export function toolInstructions(language: ReadingLanguage): string {
  const l = language === 'en' ? 'en' : 'zh'
  const list = TOOLS.map((tool) => `- ${tool.usage[l]}`).join('\n')
  if (l === 'en') {
    return [
      'You can run the app\'s own engines. To use one, reply with nothing but a single tool line:',
      '<tool>{"name": "...", "arguments": {...}}</tool>',
      'The result comes back as a TOOL RESULT message; then answer in words, using those facts and naming them.',
      'Draw, cast or compute rather than describing what the reader could do, and never invent a card, hexagram, pillar or page yourself.',
      'Palmistry and face reading need a photo, so they are not tools: for those, say which screen to open.',
      `You may use at most ${MAX_STEPS} tool calls before answering.`,
      'Tools:',
      list,
    ].join('\n')
  }
  return [
    '你可以调用本应用的推算引擎。使用时，回复中只包含一行工具调用：',
    '<tool>{"name": "...", "arguments": {...}}</tool>',
    '结果会以「TOOL RESULT」消息返回；随后用文字作答，引用其中的事实并点明出处。',
    '需要抽牌、起卦或排盘时直接调用，不要只描述来访者可以做什么，也不要自行编造牌、卦、四柱或书页。',
    '手相与面相需要照片，因此没有对应工具：遇到这类问题，请指出应打开哪个页面。',
    `作答前最多可调用 ${MAX_STEPS} 次工具。`,
    '可用工具：',
    list,
  ].join('\n')
}

const TOOL_PATTERN = /<tool>\s*({[\s\S]*?})\s*<\/tool>/

/** Finds a tool call in a model reply, if there is one. */
export function parseToolCall(reply: string): ToolCall | null {
  const match = TOOL_PATTERN.exec(reply)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1]) as { name?: unknown; arguments?: unknown }
    if (typeof parsed.name !== 'string') return null
    const spec = TOOLS.find((tool) => tool.name === parsed.name)
    if (!spec) return null
    const args = parsed.arguments && typeof parsed.arguments === 'object' ? (parsed.arguments as Record<string, unknown>) : {}
    return { name: spec.name, arguments: args }
  } catch {
    return null
  }
}

/** Runs a tool call against the deterministic engines. Never throws. */
export function runTool(call: ToolCall, language: ReadingLanguage): ToolResult {
  const spec = TOOLS.find((tool) => tool.name === call.name)
  const l = language === 'en' ? 'en' : 'zh'
  if (!spec) return { call, output: JSON.stringify({ error: `unknown tool ${call.name}` }), label: l === 'en' ? 'Unknown tool' : '未知工具', ok: false }
  try {
    const { output, label } = spec.run(call.arguments, language)
    return { call, output: JSON.stringify(output), label: label[l], ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { call, output: JSON.stringify({ error: message }), label: l === 'en' ? `${call.name} failed` : `${call.name} 调用失败`, ok: false }
  }
}

/** The message that carries a tool's result back to the model. */
export function toolResultMessage(result: ToolResult): string {
  return `TOOL RESULT ${result.call.name}: ${result.output}`
}

import type { TarotDraw } from '../engines/tarot/types'
import type { ReadingLanguage } from '../types'

/**
 * Everything the model is allowed to know about a draw. The model narrates
 * from this structure and nothing else; it never draws or interprets cards
 * that are not listed here.
 */
export interface TarotContext {
  practice: 'tarot'
  language: ReadingLanguage
  question: string
  spread: string
  cards: {
    position: string
    positionAsks: string
    card: string
    orientation: 'upright' | 'reversed'
    keywords: string[]
    element: string
  }[]
}

export function tarotContext(draw: TarotDraw, language: ReadingLanguage): TarotContext {
  const textLanguage = language === 'en' ? 'en' : 'zh'
  return {
    practice: 'tarot',
    language,
    question: draw.question,
    spread: draw.spread.name[textLanguage],
    cards: draw.cards.map((item) => ({
      position: item.position.name[textLanguage],
      positionAsks: item.position.question[textLanguage],
      card: item.card.text[textLanguage].name,
      orientation: item.orientation,
      keywords: item.card.text[textLanguage][item.orientation],
      element: item.card.element,
    })),
  }
}

const LANGUAGE_NAME: Record<ReadingLanguage, string> = {
  en: 'English',
  'zh-Hans': 'Simplified Chinese (简体中文)',
  'zh-Hant': 'Traditional Chinese (繁體中文)',
  yue: 'written Cantonese (粵語書面語)',
}

export function systemPrompt(language: ReadingLanguage): string {
  return [
    'You are LazyOracle, a warm and thoughtful tarot reader.',
    'You receive a JSON object describing a completed draw. Interpret only the cards listed, in their listed positions and orientations. Never add, replace or re-draw cards, and never contradict a listed keyword.',
    `Write in ${LANGUAGE_NAME[language]}.`,
    'Structure: one sentence naming the overall theme; then one short paragraph per card that names the position and the card (with "reversed" when reversed) and connects its keywords to the question; then two or three sentences of practical, gentle advice.',
    'Tone: warm, specific, non-deterministic ("this suggests", "a good season for"). No medical, legal or financial promises. Do not mention that you are an AI or that this is a JSON object.',
    'Length: about 180 to 320 words for one or three cards, up to 500 words for ten.',
  ].join('\n')
}

export function userPrompt(context: TarotContext): string {
  const question = context.question || '(no question given: read for the querent\'s current situation)'
  return `Question: ${question}\n\nDraw:\n${JSON.stringify(context, null, 1)}`
}

const OFFLINE_COPY = {
  en: {
    theme: (spread: string) => `A ${spread} reading.`,
    reversed: 'reversed',
    card: (position: string, card: string, orientation: string, keywords: string, asks: string) =>
      `${position}: ${card}${orientation ? ` (${orientation})` : ''}. ${asks} Its keywords are ${keywords}.`,
    advice: 'Read the cards together: notice which keywords repeat and which pull against each other. That tension is where your question lives. Take one small, concrete step in the direction the last card points.',
    note: 'This reading was composed from the card meanings alone. Connect a model in Settings for a narrative reading.',
  },
  zh: {
    theme: (spread: string) => `这是一次「${spread}」牌阵的解读。`,
    reversed: '逆位',
    card: (position: string, card: string, orientation: string, keywords: string, asks: string) =>
      `${position}：${card}${orientation ? `（${orientation}）` : ''}。${asks} 关键词：${keywords}。`,
    advice: '把几张牌放在一起看：留意哪些关键词重复出现，哪些互相拉扯，那正是问题所在。朝最后一张牌指向的方向，迈出一个具体的小步。',
    note: '本解读仅由牌义组合而成。在设置中连接模型后，可以获得叙事式解读。',
  },
}

/**
 * A reading that needs no model at all: the card meanings arranged by
 * position. It is what the app shows when no model is configured, and the
 * baseline every model reading must at least agree with.
 */
export function offlineReading(context: TarotContext): string {
  const copy = context.language === 'en' ? OFFLINE_COPY.en : OFFLINE_COPY.zh
  const joiner = context.language === 'en' ? ', ' : '、'
  const lines = [copy.theme(context.spread)]
  for (const item of context.cards) {
    lines.push(copy.card(item.position, item.card, item.orientation === 'reversed' ? copy.reversed : '', item.keywords.join(joiner), item.positionAsks))
  }
  lines.push(copy.advice)
  lines.push(copy.note)
  return lines.join('\n\n')
}

/**
 * Does a one-billion-parameter model actually manage the two-pass design?
 *
 * The downloaded reader on a phone without Apple Intelligence cannot be
 * trusted to orchestrate tools through JSON, so it is asked to do two simpler
 * things instead: name one computation from a list, then read the computed
 * facts back in words. This runs both passes against a local 1B model — the
 * same size the phone would download — so the design is measured rather than
 * assumed.
 *
 *   ollama pull gemma3:1b && node tools/auspice-small-model-test.mjs
 */
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const MODEL = process.env.AUSPICE_SMALL ?? 'gemma3:1b'
const OLLAMA = 'http://127.0.0.1:11434/api/chat'

const context = vm.createContext({ console, TextDecoder, TextEncoder })
vm.runInContext(readFileSync('native/shared/lazyoracle-engines.js', 'utf8'), context)
const LazyOracle = context.LazyOracle

const profile = {
  name: '', year: 1990, month: 6, day: 15, hour: 8, minute: 30,
  timeKnown: true, gender: 'female', place: 'Shanghai',
  latitude: 31.23, longitude: 121.47, utcOffsetHours: 8,
}
const engine = (id, input) => {
  const answer = JSON.parse(LazyOracle.evaluateJson(JSON.stringify({ engine: id, input })))
  if (!answer.ok) throw new Error(answer.error)
  return answer.data
}
const today = () => new Date().toISOString().slice(0, 10)

const TOOLS = [
  ['draw_tarot', 'Draw a tarot spread and return the cards with their positions and keywords.'],
  ['cast_iching', 'Cast a hexagram and return the lines and where the classical rule says to read.'],
  ['four_pillars', "Compute the reader's BaZi chart from their saved birth details."],
  ['natal_chart', "Compute the reader's natal chart and today's transits."],
  ['eight_mansions', "Compute the reader's eight mansions and the quality of each direction."],
  ['open_book', 'Open a page of the Book of Answers or the Book of Questions.'],
  ['birth_details', 'Report the birth details saved on this device.'],
  ['almanac_day', 'The almanac for a date: 宜, 忌, the day officer, the lucky hours.'],
  ['today', "Today's date, the lunar date, and the day's stem and branch."],
  ['read_palm', 'Read a hand, or open the camera for one.'],
  ['read_face', 'Read a face, or open the camera for one.'],
]

const run = (name) => {
  switch (name) {
    case 'draw_tarot': return engine('tarot.draw', { spread: 'three', question: '' })
    case 'cast_iching': return engine('iching.cast', { method: 'coins', question: '' })
    case 'four_pillars': return engine('bazi.chart', profile)
    case 'natal_chart': return engine('astrology.transits', { birth: profile })
    case 'eight_mansions': return engine('fengshui.mansions', {
      year: profile.year, month: profile.month, day: profile.day, gender: profile.gender })
    case 'open_book': return engine('book.open', { book: 'answers', question: '' })
    case 'almanac_day': case 'today': return engine('almanac.day', { date: today() })
    case 'read_palm': return { opened: 'palm', note: "The camera is open on the palmistry screen. Hold an open palm to it and tap Read this hand." }
    case 'read_face': return { opened: 'face', note: "The camera is open on the face-reading screen. Face it in even light and tap Read this face." }
    default: return { note: 'nothing computed' }
  }
}

async function ask(system, user, maxTokens, { think = true, temperature = 0.7 } = {}) {
  const response = await fetch(OLLAMA, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, stream: false, think,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      // A small model repeats itself without this; the last paragraph comes
      // back twice, which reads as a fault rather than as emphasis.
      options: { temperature, num_predict: maxTokens, repeat_penalty: 1.15, repeat_last_n: 256 },
    }),
  })
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
  return (await response.json()).message?.content ?? ''
}

const menu = TOOLS.map(([name, description], i) => `${i + 1}. ${name} — ${description}`).join('\n')
const CHOOSE = 'Choose the one computation that answers the reader\'s question. Reply with its name alone and nothing else. If none of them fits, reply none.'
/**
 * A small model will not infer the answer's language from the question when
 * the facts it is reading are full of Chinese; it follows the facts. So the
 * language is stated as an instruction rather than left to be worked out.
 */
const SCRIPTS = {
  en: 'Answer in English.',
  'zh-Hans': '用简体中文回答。',
}

function languageOf(question) {
  return /[\u4e00-\u9fff]/.test(question) ? 'zh-Hans' : 'en'
}

const narrate = (language) => `You are the reader in Auspice. You are given facts that have already been computed on this device. Read them. Never add a card, hexagram, pillar or almanac entry that is not among them.

${SCRIPTS[language]} Keep only the tradition's own terms in Chinese characters — 宜, 忌, 日主, 卦 — and write everything else in that language. Two or three short paragraphs. No headings, no lists, no bold labels, and never repeat a sentence you have already written. Open with the answer, give the fact it rests on, end with one thing the reader can do.`

/**
 * Which computation a question is asking for, decided by the words in it.
 *
 * This runs before the model is asked anything. It is instant, it cannot
 * hallucinate, and it covers the way people actually phrase these questions in
 * both languages. The model is only consulted when none of it matches, and if
 * the model cannot choose either, nothing is narrated at all — a reading with
 * no computed facts behind it is the one thing this app must never produce.
 */
const ROUTES = [
  ['read_palm', ['palm', 'my hand', 'hand reading', '手相', '看手']],
  ['read_face', ['face reading', 'my face', 'read my face', '面相', '看脸', '看臉']],
  ['draw_tarot', ['tarot', 'card', 'cards', 'spread', '塔罗', '塔羅', '抽牌']],
  ['cast_iching', ['hexagram', 'i ching', 'yijing', 'yarrow', 'coins', '卦', '易经', '易經', '起卦']],
  ['four_pillars', ['day master', 'four pillars', 'bazi', 'ba zi', 'my chart', '日主', '八字', '四柱']],
  ['eight_mansions', ['desk', 'sector', 'direction', 'feng shui', 'fengshui', 'which way', '风水', '風水', '八宅', '方位']],
  ['natal_chart', ['natal', 'transit', 'astrolog', 'horoscope', 'planets', '星盘', '星盤', '行运']],
  ['open_book', ['open the book', 'book of answers', 'book for me', '答案之书', '答案之書', '翻书']],
  ['birth_details', ['birth details', 'my birthday', 'what do you know about me', '出生资料', '出生資料']],
  ['almanac_day', ['today', 'tomorrow', 'good day', 'auspicious', 'almanac', 'sign', 'travel', 'marry',
                   'move house', 'contract', '今天', '今日', '明天', '黄历', '黃曆', '宜', '忌']],
]

function route(question) {
  const asked = question.toLowerCase()
  for (const [tool, words] of ROUTES) {
    if (words.some((word) => asked.includes(word))) return tool
  }
  return null
}

const CASES = [
  ['Is today a good day to sign a contract?', 'almanac_day'],
  ['Draw me three cards about my work.', 'draw_tarot'],
  ['Cast a hexagram about the new job.', 'cast_iching'],
  ['What does my day master need?', 'four_pillars'],
  ['Where should I put my desk?', 'eight_mansions'],
  ['Read my palm.', 'read_palm'],
  ['What is today?', 'almanac_day'],
  ['今天适合搬家吗？', 'almanac_day'],
  ['Open the book for me.', 'open_book'],
]

let correct = 0
let byWords = 0
for (const [question, expected] of CASES) {
  const started = Date.now()
  let picked = route(question)
  let how = 'words'
  if (!picked) {
    // Thinking tokens eat a short budget whole, so the choosing pass asks for
    // the answer directly and is given room for it.
    const raw = await ask(CHOOSE, `${menu}\n\nQuestion: ${question}\n\nName:`, 24, { think: false, temperature: 0.2 })
    const cleaned = raw.toLowerCase().trim()
    picked = TOOLS.map(([n]) => n).find((n) => cleaned.includes(n)) ?? null
    how = 'model'
  } else {
    byWords += 1
  }
  const hit = picked === expected
  if (hit) correct += 1

  console.log(`\n── ${question}`)
  if (!picked) {
    console.log(`   chose nothing — refusing to narrate  ${((Date.now() - started) / 1000).toFixed(1)}s`)
    continue
  }
  const computed = run(picked)
  // A camera tool that has measured nothing has no facts to read. The model is
  // not asked to narrate an absence — it invents one. The instruction is shown
  // as it stands instead.
  if (computed && computed.opened) {
    console.log(`   chose ${picked} by ${how} ${hit ? '✓' : `✗ (wanted ${expected})`}  ${((Date.now() - started) / 1000).toFixed(1)}s`)
    console.log(`   [no model call] ${computed.note}`)
    continue
  }
  const facts = `Computed facts (${picked}):\n${JSON.stringify(computed).slice(0, 6000)}`
  const language = languageOf(question)
  const reading = await ask(
    narrate(language),
    `${facts}\n\nThe reader asks: ${question}\n\n${SCRIPTS[language]}`,
    400,
    { think: false },
  )
  console.log(`   chose ${picked} by ${how} ${hit ? '✓' : `✗ (wanted ${expected})`}  ${((Date.now() - started) / 1000).toFixed(1)}s`)
  console.log(`   ${reading.trim().replace(/\n+/g, '\n   ').slice(0, 620)}`)
}
console.log(`\ntool chosen correctly: ${correct}/${CASES.length} with ${MODEL} (${byWords} decided by words, no model call)`)

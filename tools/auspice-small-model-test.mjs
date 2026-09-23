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
    default: return { note: 'nothing computed' }
  }
}

async function ask(system, user, maxTokens) {
  const response = await fetch(OLLAMA, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, stream: false,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      options: { temperature: 0.7, num_predict: maxTokens },
    }),
  })
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`)
  return (await response.json()).message?.content ?? ''
}

const menu = TOOLS.map(([name, description], i) => `${i + 1}. ${name} — ${description}`).join('\n')
const CHOOSE = 'Choose the one computation that answers the reader\'s question. Reply with its name alone and nothing else. If none of them fits, reply none.'
const NARRATE = `You are the reader in Auspice. You are given facts that have already been computed on this device; read them, and never add a card, hexagram, pillar or almanac entry that is not among them.

Reply in the language the reader wrote in. Keep the tradition's terms in Chinese characters: 宜, 忌, 日主, 卦. Write two or three short paragraphs — no headings, no lists, no bold labels. Open with the answer, give the fact it rests on, and end with one thing the reader can do.`

const CASES = [
  ['Is today a good day to sign a contract?', 'almanac_day'],
  ['Draw me three cards about my work.', 'draw_tarot'],
  ['Cast a hexagram about the new job.', 'cast_iching'],
  ['What does my day master need?', 'four_pillars'],
  ['Where should I put my desk?', 'eight_mansions'],
  ['Read my palm.', 'read_palm'],
  ['What is today?', 'today'],
  ['Open the book for me.', 'open_book'],
]

let correct = 0
for (const [question, expected] of CASES) {
  const started = Date.now()
  const raw = await ask(CHOOSE, `${menu}\n\nQuestion: ${question}\n\nName:`, 12)
  const cleaned = raw.toLowerCase().trim()
  const picked = TOOLS.map(([n]) => n).find((n) => cleaned.includes(n)) ?? null
  const hit = picked === expected
  if (hit) correct += 1
  const facts = picked ? `Computed facts (${picked}):\n${JSON.stringify(run(picked)).slice(0, 6000)}` : ''
  const reading = await ask(NARRATE, `${facts}\n\nThe reader asks: ${question}\n\nRead the facts above and answer.`, 400)
  console.log(`\n── ${question}`)
  console.log(`   chose ${picked ?? 'none'} ${hit ? '✓' : `✗ (wanted ${expected})`}  ${((Date.now() - started) / 1000).toFixed(1)}s`)
  console.log(`   ${reading.trim().replace(/\n+/g, '\n   ').slice(0, 700)}`)
}
console.log(`\ntool chosen correctly: ${correct}/${CASES.length} with ${MODEL}`)

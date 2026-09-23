/**
 * Ask the reading service real questions and check what it actually does.
 *
 * This runs the same agent loop the apps run — the same system prompt, the
 * same tool schemas, the same engine bundle — against the same relay, so a
 * pass here is evidence about the app and not about a mock. It reports which
 * tools each question reached, how long the answer took, and prints the answer
 * so its quality can be judged rather than assumed.
 *
 *   node tools/auspice-agent-test.mjs            # the whole set
 *   node tools/auspice-agent-test.mjs almanac    # only questions matching
 */
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const BASE = 'https://oracle-fast.lazying.art/v1'
const TIER = process.env.AUSPICE_TIER ?? 'tianji-fast'
const MAX_STEPS = 6

// The rules, exactly as the apps load them.
const context = vm.createContext({ console, TextDecoder, TextEncoder })
vm.runInContext(readFileSync('native/shared/lazyoracle-engines.js', 'utf8'), context)
const LazyOracle = context.LazyOracle

const profile = {
  name: 'Test', year: 1990, month: 6, day: 15, hour: 8, minute: 30,
  timeKnown: true, gender: 'female', place: 'Shanghai',
  latitude: 31.23, longitude: 121.47, utcOffsetHours: 8,
}

/** Stands in for the camera screens: nothing measured yet, then measured. */
const measured = { palm: null, face: null }

function engine(id, input) {
  const answer = JSON.parse(LazyOracle.evaluateJson(JSON.stringify({ engine: id, input })))
  if (!answer.ok) throw new Error(answer.error)
  return answer.data
}

const property = (type, description, options) =>
  options ? { type, description, enum: options } : { type, description }

const TOOLS = [
  ['draw_tarot', 'Draw a tarot spread from a full shuffle and return the cards with their positions and keywords.', {
    spread: property('string', 'One card, three, or the ten-card Celtic Cross.', ['one', 'three', 'celtic']),
    question: property('string', 'The question the cards are drawn for.'),
  }],
  ['cast_iching', 'Cast a hexagram and return the lines, the primary and resulting hexagrams, and where the classical rule says to read.', {
    method: property('string', 'Three coins, or yarrow stalks.', ['coins', 'yarrow']),
    question: property('string', 'The question the hexagram is cast for.'),
  }],
  ['four_pillars', "Compute the reader's BaZi chart from their saved birth details.", {}],
  ['natal_chart', "Compute the reader's natal chart, and today's transits against it.", {}],
  ['eight_mansions', "Compute the reader's eight mansions: their gua, group and the quality of each direction.", {}],
  ['open_book', 'Open a page of the Book of Answers or the Book of Questions.', {
    book: property('string', 'Which book to open.', ['answers', 'questions']),
    question: property('string', 'What is being asked.'),
  }],
  ['birth_details', 'Report the birth details saved on this device.', {}],
  ['almanac_day', 'The almanac for a date: 宜, 忌, the day officer, the mansion, the spirits and the lucky hours, with a verdict for one undertaking if given.', {
    date: property('string', 'ISO date, e.g. 2026-09-23. Defaults to today.'),
    activity: property('string', 'One of: marry, travel, move, business, contract, build, bed, ritual, medicine, study, meet, grooming.'),
  }],
  ['today', "Today's date, the lunar date, and the day's stem and branch.", {}],
  ['read_palm', 'Read a hand. Returns the measurements if a hand has already been measured; otherwise opens the camera on the palmistry screen.', {}],
  ['read_face', 'Read a face. Returns the measurements if a face has already been measured; otherwise opens the camera on the face-reading screen.', {}],
].map(([name, description, properties]) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties } },
}))

const today = () => new Date().toISOString().slice(0, 10)

function runTool(name, args) {
  switch (name) {
    case 'draw_tarot': return engine('tarot.draw', { spread: args.spread ?? 'three', question: args.question ?? '' })
    case 'cast_iching': return engine('iching.cast', { method: args.method ?? 'coins', question: args.question ?? '' })
    case 'four_pillars': return engine('bazi.chart', profile)
    case 'natal_chart': return engine('astrology.transits', { birth: profile })
    case 'eight_mansions': return engine('fengshui.mansions', {
      year: profile.year, month: profile.month, day: profile.day, gender: profile.gender,
    })
    case 'open_book': return engine('book.open', { book: args.book ?? 'answers', question: args.question ?? '' })
    case 'birth_details': return { saved: true, ...profile }
    case 'almanac_day': return engine('almanac.day', { date: args.date ?? today(), ...(args.activity ? { activity: args.activity } : {}) })
    case 'today': return engine('almanac.day', { date: today() })
    case 'read_palm':
      if (measured.palm) return measured.palm
      return { opened: 'palm', note: "The camera is now open on the palmistry screen. No hand has been measured yet. Ask the reader to hold an open palm to the camera and tap 'Read this hand', then call read_palm again." }
    case 'read_face':
      if (measured.face) return measured.face
      return { opened: 'face', note: "The camera is now open on the face-reading screen. No face has been measured yet. Ask the reader to face the camera and tap 'Read this face', then call read_face again." }
    default: return { error: `no such tool: ${name}` }
  }
}

const SYSTEM = readFileSync('tools/auspice-system-prompt.txt', 'utf8')

/**
 * The relay answers as a stream whether or not one is asked for, so the reply
 * is reassembled here exactly as the apps reassemble it: text appended, and
 * tool calls pieced together from fragments that carry the name once and the
 * arguments a few characters at a time.
 */
async function collect(response) {
  const type = response.headers.get('content-type') ?? ''
  if (!type.includes('event-stream')) {
    const body = await response.json()
    return body.choices?.[0]?.message ?? {}
  }
  const text = await response.text()
  let content = ''
  let reasoningSeen = ''
  const calls = new Map()
  for (const line of text.split('\n')) {
    if (!line.startsWith('data:')) continue
    const payload = line.slice(5).trim()
    if (payload === '[DONE]') break
    let chunk
    try { chunk = JSON.parse(payload) } catch { continue }
    const delta = chunk.choices?.[0]?.delta
    if (!delta) continue
    if (delta.content) content += delta.content
    if (process.env.AUSPICE_RAW && delta.reasoning) reasoningSeen += delta.reasoning
    for (const fragment of delta.tool_calls ?? []) {
      const index = fragment.index ?? 0
      const current = calls.get(index) ?? { id: undefined, function: { name: '', arguments: '' } }
      if (fragment.id) current.id = fragment.id
      if (fragment.function?.name) current.function.name = fragment.function.name
      if (fragment.function?.arguments) current.function.arguments += fragment.function.arguments
      calls.set(index, current)
    }
  }
  if (process.env.AUSPICE_RAW && !content && calls.size === 0) {
    console.log('   [raw, no content]', text.slice(0, 600).replace(/\n/g, ' '))
    if (reasoningSeen) console.log('   [reasoning]', reasoningSeen.slice(0, 300))
  }
  const tool_calls = [...calls.entries()].sort((a, b) => a[0] - b[0])
    .map(([index, call]) => ({ id: call.id ?? `call_${index}`, type: 'function', function: call.function }))
  return { role: 'assistant', content, ...(tool_calls.length ? { tool_calls } : {}) }
}

async function ask(question) {
  const started = Date.now()
  const messages = [{ role: 'system', content: SYSTEM }, { role: 'user', content: question }]
  const used = []
  let answer = ''
  let emptyReplies = 0

  for (let step = 0; step < MAX_STEPS; step += 1) {
    const response = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: TIER, messages, tools: TOOLS, tool_choice: 'auto', parallel_tool_calls: false, temperature: 0.7 }),
    })
    if (!response.ok) throw new Error(`${response.status} ${(await response.text()).slice(0, 200)}`)
    const reply = await collect(response)
    if (reply.content) answer = reply.content

    const calls = reply.tool_calls ?? []
    if (process.env.AUSPICE_TRACE) {
      console.log(`   [step ${step}] content=${JSON.stringify((reply.content || '').slice(0, 120))} calls=${calls.map((c) => c.function?.name).join(',') || 'none'}`)
    }
    if (calls.length === 0) {
      if (!answer.trim() && emptyReplies === 0) { emptyReplies += 1; continue }
      break
    }

    messages.push(reply)
    for (const call of calls) {
      const name = call.function?.name ?? ''
      let args = {}
      try { args = JSON.parse(call.function?.arguments || '{}') } catch { /* the model sometimes sends a fragment */ }
      used.push(name)
      let result
      try { result = runTool(name, args) } catch (error) { result = { error: String(error.message ?? error) } }
      messages.push({ role: 'tool', tool_call_id: call.id, name, content: JSON.stringify(result) })
    }
  }
  return { question, used, answer, seconds: ((Date.now() - started) / 1000).toFixed(1) }
}

const QUESTIONS = [
  'Is today a good day to sign a contract?',
  'Draw me three cards about my work this month.',
  'Cast a hexagram about whether to take the new job.',
  'What does my day master need?',
  'Where should I put my desk?',
  'What does my natal chart say about this week?',
  'Read my palm.',
  'What does my face say about my middle years?',
  'I cannot decide. Just open the book for me.',
  'What is today, and is it good for travelling?',
]

const filter = process.argv[2]
const chosen = filter ? QUESTIONS.filter((q) => q.toLowerCase().includes(filter.toLowerCase())) : QUESTIONS

const reached = new Set()
let failures = 0
for (const question of chosen) {
  try {
    const result = await ask(question)
    result.used.forEach((name) => reached.add(name))
    console.log(`\n── ${result.question}`)
    console.log(`   tools: ${result.used.join(' → ') || '(none)'}   ${result.seconds}s`)
    console.log(`   ${(result.answer || '(no answer)').replace(/\n+/g, '\n   ')}`)
    if (!result.answer || result.answer.length < 40) {
      console.log('   ⚠ the answer is too short to be a reading')
      failures += 1
    }
  } catch (error) {
    console.log(`\n── ${question}\n   ✗ ${error.message}`)
    failures += 1
  }
}

const all = TOOLS.map((t) => t.function.name)
const missed = all.filter((name) => !reached.has(name))
console.log(`\ntools reached: ${reached.size}/${all.length}`)
if (missed.length) console.log(`never called: ${missed.join(', ')}`)
console.log(failures ? `${failures} question(s) answered poorly` : 'every question answered')
process.exit(failures ? 1 : 0)

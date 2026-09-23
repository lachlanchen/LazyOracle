import { chatWithEndpoint, loadModelSettings, ModelUnavailable, streamMessagesFull, type ChatMessage, type ToolCallRequest } from './llm'

export type ReadingSource = 'none' | 'offline' | 'model'

export interface ReadingRequest {
  system: string
  user: string
  /** The deterministic reading used when no model is available. */
  offline: string
  signal: AbortSignal
}

export interface ReadingUpdate {
  source: ReadingSource
  text: string
  done: boolean
}

/** Streams a cloud reading, with the deterministic composition as fallback. */
export function generateReading(request: ReadingRequest, onUpdate: (update: ReadingUpdate) => void): void {
  const settings = loadModelSettings()
  const finishOffline = () => onUpdate({ source: 'offline', text: request.offline, done: true })

  const stream = (source: 'model', run: (onToken: (t: string) => void) => Promise<string>) => {
    let streamed = ''
    onUpdate({ source, text: '', done: false })
    return run((token) => {
      streamed += token
      onUpdate({ source, text: streamed, done: false })
    }).then((text) => {
      if (request.signal.aborted) return
      if (text.trim()) onUpdate({ source, text, done: true })
      else finishOffline()
    })
  }

  const chain = settings.endpointEnabled
    ? stream('model', (onToken) => chatWithEndpoint(settings, {
        system: request.system, user: request.user, signal: request.signal, onToken,
      }))
    : Promise.resolve(finishOffline())

  chain.catch((error: unknown) => {
    if (request.signal.aborted) return
    if (!(error instanceof ModelUnavailable)) console.warn('reading failed', error)
    finishOffline()
  })
}

/** Chat requires the cloud; individual practices also have offline readings. */
export function chatAvailable(): boolean {
  return loadModelSettings().endpointEnabled
}

export interface ChatUpdate {
  source: 'model'
  text: string
  done: boolean
  /** Tools the model asked for, when the provider supports function calling. */
  toolCalls?: ToolCallRequest[]
}

/** Streams a cloud conversation, including requests for deterministic tools. */
export async function generateChat(
  messages: ChatMessage[],
  onUpdate: (update: ChatUpdate) => void,
  signal?: AbortSignal,
  tools?: unknown[],
): Promise<void> {
  const settings = loadModelSettings()
  const source: ChatUpdate['source'] = 'model'
  let streamed = ''
  const onToken = (token: string) => {
    streamed += token
    onUpdate({ source, text: streamed, done: false })
  }
  onUpdate({ source, text: '', done: false })
  const result = await streamMessagesFull(
    settings,
    messages,
    { signal, onToken, tools },
  )
  onUpdate({ source, text: result.text || streamed, done: true, toolCalls: result.toolCalls })
}


/** Older conversation turns are compacted to fit this character budget. */
export function historyBudget(): number {
  return 16000
}

/** Splits turns into what fits in the budget (from the end) and what does not. */
export function fitToBudget<T extends { content: string }>(turns: T[], budget: number): { keep: T[]; older: T[] } {
  let used = 0
  let index = turns.length
  while (index > 0) {
    const size = turns[index - 1].content.length + 16
    if (used + size > budget && turns.length - index >= 2) break
    used += size
    index -= 1
  }
  return { keep: turns.slice(index), older: turns.slice(0, index) }
}

/**
 * Asks the model for a short account of the older turns, so a long
 * conversation keeps its thread without carrying every word.
 */
export async function summariseTurns(previous: string, older: { role: string; content: string }[], language: 'en' | 'zh-Hans', signal?: AbortSignal): Promise<string> {
  if (older.length === 0) return previous
  const transcript = older.map((turn) => `${turn.role === 'user' ? 'Q' : 'A'}: ${turn.content}`).join('\n')
  const instruction =
    language === 'en'
      ? 'Summarise this part of a divination conversation in at most 70 words. Keep every fact that a later answer would need: the question asked, birth details, cards drawn, hexagrams cast, and anything decided. Write plain prose, no list.'
      : '用不超过 120 字概括这段占卜对话。保留后续回答需要的事实：所问之事、出生资料、抽到的牌、所起的卦，以及已经作出的决定。用平实的散文，不要列表。'
  const messages: ChatMessage[] = [
    { role: 'system', content: instruction },
    { role: 'user', content: previous ? `Earlier summary: ${previous}\n\nNew turns:\n${transcript}` : transcript },
  ]
  let text = ''
  await generateChat(messages, (update) => {
    text = update.text
  }, signal)
  return text.trim() || previous
}

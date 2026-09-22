import { chatWithEndpoint, loadModelSettings, ModelUnavailable, streamMessages, type ChatMessage } from './llm'
import { chatOnDevice, deviceModelReady, selectedDeviceModel, streamOnDevice } from './device-model'

export type ReadingSource = 'none' | 'offline' | 'device' | 'model'

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

/**
 * Produces a reading and reports progress. Order: the on-device model when
 * one is loaded, then Tianji Cloud when the user switched it on, then the
 * offline composition. The offline text is also the fallback for any failure.
 * The cloud is asked for the same tier the user chose on the device, so
 * 天机专业版 stays 天机专业版 wherever the reading is written.
 */
export function generateReading(request: ReadingRequest, onUpdate: (update: ReadingUpdate) => void): void {
  const settings = loadModelSettings()
  const finishOffline = () => onUpdate({ source: 'offline', text: request.offline, done: true })

  const stream = (source: 'device' | 'model', run: (onToken: (t: string) => void) => Promise<string>) => {
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

  const tier = selectedDeviceModel()?.id ?? settings.model
  const viaEndpoint = () =>
    stream('model', (onToken) => chatWithEndpoint({ ...settings, model: tier }, { system: request.system, user: request.user, signal: request.signal, onToken }))

  const chain = deviceModelReady()
    ? stream('device', (onToken) => chatOnDevice({ system: request.system, user: request.user, signal: request.signal, onToken })).catch((error: unknown) => {
        if (request.signal.aborted) return
        console.warn('on-device reading failed', error)
        if (settings.endpointEnabled) return viaEndpoint()
        finishOffline()
      })
    : settings.endpointEnabled
      ? viaEndpoint()
      : Promise.resolve(finishOffline())

  chain.catch((error: unknown) => {
    if (request.signal.aborted) return
    if (!(error instanceof ModelUnavailable)) console.warn('reading failed', error)
    finishOffline()
  })
}

/** Whether a conversation can be held at all: a model on the device, or the cloud. */
export function chatAvailable(): boolean {
  return deviceModelReady() || loadModelSettings().endpointEnabled
}

export interface ChatUpdate {
  source: 'device' | 'model'
  text: string
  done: boolean
}

/**
 * Streams an answer to a conversation, from the on-device model when one is
 * loaded and otherwise from Tianji Cloud. Unlike a reading there is no
 * deterministic fallback: a conversation needs a model, so the caller checks
 * `chatAvailable()` first and offers a download when it is false.
 */
export async function generateChat(messages: ChatMessage[], onUpdate: (update: ChatUpdate) => void, signal?: AbortSignal): Promise<void> {
  const settings = loadModelSettings()
  const source: ChatUpdate['source'] = deviceModelReady() ? 'device' : 'model'
  let streamed = ''
  const onToken = (token: string) => {
    streamed += token
    onUpdate({ source, text: streamed, done: false })
  }
  onUpdate({ source, text: '', done: false })
  const text =
    source === 'device'
      ? await streamOnDevice(messages, { signal, onToken })
      : await streamMessages({ ...settings, model: selectedDeviceModel()?.id ?? settings.model }, messages, { signal, onToken })
  onUpdate({ source, text: text || streamed, done: true })
}


/**
 * How much conversation may travel with a question, in characters. A model
 * running on the phone has a small window, so it gets a small budget; the
 * cloud can hold far more. Anything older is compacted rather than dropped.
 */
export function historyBudget(): number {
  return deviceModelReady() ? 1600 : 16000
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

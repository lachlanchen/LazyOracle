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

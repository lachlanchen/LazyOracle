import { chatWithEndpoint, loadModelSettings, ModelUnavailable } from './llm'
import { chatOnDevice, deviceModelReady } from './device-model'

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
 * one is loaded, then the user's endpoint when enabled, then the offline
 * composition. The offline text is also the fallback for any failure.
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

  const viaEndpoint = () =>
    stream('model', (onToken) => chatWithEndpoint(settings, { system: request.system, user: request.user, signal: request.signal, onToken }))

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

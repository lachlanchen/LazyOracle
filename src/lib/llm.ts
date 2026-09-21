/**
 * Model access. Three sources, tried in this order when enabled:
 *
 * 1. `device`: an on-device engine (llama.cpp through the native shells; not
 *    yet wired on the PWA, so it reports unavailable).
 * 2. `endpoint`: any OpenAI-compatible chat endpoint the user configured,
 *    typically the owner's workstation reached through LazyEdge, or a local
 *    Ollama on a desktop. Sent only when the user turned it on.
 * 3. `offline`: the deterministic composition from card meanings. Always works.
 */

export interface ModelSettings {
  endpointEnabled: boolean
  endpointUrl: string
  endpointToken: string
  model: string
}

export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  endpointEnabled: false,
  endpointUrl: 'http://127.0.0.1:11434/v1',
  endpointToken: '',
  model: 'qwen3:4b-q4_K_M',
}

const SETTINGS_KEY = 'lazyoracle.model'

export function loadModelSettings(): ModelSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_MODEL_SETTINGS
    return { ...DEFAULT_MODEL_SETTINGS, ...(JSON.parse(raw) as Partial<ModelSettings>) }
  } catch {
    return DEFAULT_MODEL_SETTINGS
  }
}

export function saveModelSettings(settings: ModelSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Storage may be blocked; the settings then last for the session only.
  }
}

export interface ChatRequest {
  system: string
  user: string
  signal?: AbortSignal
  onToken?: (text: string) => void
}

export class ModelUnavailable extends Error {}

/** Strips a Qwen3 "thinking" block if the server did not already. */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim()
}

function chatUrl(base: string): string {
  const trimmed = base.replace(/\/+$/, '')
  return trimmed.endsWith('/chat/completions') ? trimmed : `${trimmed}/chat/completions`
}

/** Streams a completion from an OpenAI-compatible endpoint. Resolves to the full text. */
export async function chatWithEndpoint(settings: ModelSettings, request: ChatRequest, fetchImpl: typeof fetch = fetch): Promise<string> {
  if (!settings.endpointEnabled || !settings.endpointUrl) throw new ModelUnavailable('endpoint disabled')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (settings.endpointToken) headers.Authorization = `Bearer ${settings.endpointToken}`
  const response = await fetchImpl(chatUrl(settings.endpointUrl), {
    method: 'POST',
    headers,
    signal: request.signal,
    body: JSON.stringify({
      model: settings.model,
      stream: true,
      temperature: 0.7,
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.user },
      ],
    }),
  })
  if (!response.ok || !response.body) throw new ModelUnavailable(`endpoint answered ${response.status}`)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  let thinking = false
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const chunk = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] }
        const delta = chunk.choices?.[0]?.delta?.content ?? ''
        if (!delta) continue
        // Hide Qwen3 reasoning that streams inside <think> tags.
        let visible = delta
        if (visible.includes('<think>')) thinking = true
        if (thinking) {
          if (visible.includes('</think>')) {
            thinking = false
            visible = visible.slice(visible.indexOf('</think>') + 8)
          } else {
            visible = ''
          }
        }
        if (!visible) continue
        text += visible
        request.onToken?.(visible)
      } catch {
        // Ignore keep-alive or malformed lines.
      }
    }
  }
  return stripThinking(text)
}

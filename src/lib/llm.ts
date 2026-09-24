/** Tianji Cloud narration, with deterministic offline readings in readings.ts. */

export interface ModelSettings {
  /** The cloud reading service (Tianji Cloud); enabled by default, with an explicit opt-out. */
  endpointEnabled: boolean
  endpointUrl: string
  endpointToken: string
  /** Reading tier sent to our relay. */
  model: string
}

/** Provider credentials stay on the relay, never in the app. */
export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  endpointEnabled: true,
  // Hosted PWAs use their own relay so the site's self-only connection policy
  // remains effective. Packaged apps use Huanayun directly.
  endpointUrl: typeof location !== 'undefined'
    && ['https://oracle.lazying.art', 'https://oracle-fast.lazying.art'].includes(location.origin)
    ? `${location.origin}/v1` : 'https://oracle-fast.lazying.art/v1',
  endpointToken: '',
  model: 'tianji-fast',
}

const SETTINGS_KEY = 'lazyoracle.model'

export function loadModelSettings(): ModelSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_MODEL_SETTINGS
    const stored: unknown = JSON.parse(raw)
    // Keep an explicit cloud opt-out. Legacy URLs, tokens and downloaded-model
    // tiers must not select an obsolete host or revive a local reader.
    const endpointEnabled = stored !== null && typeof stored === 'object'
      && 'endpointEnabled' in stored && typeof stored.endpointEnabled === 'boolean'
      ? stored.endpointEnabled : DEFAULT_MODEL_SETTINGS.endpointEnabled
    return { ...DEFAULT_MODEL_SETTINGS, endpointEnabled }
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

/** A function call the model asked for, in the shape every provider returns. */
export interface ToolCallRequest {
  id: string
  name: string
  /** Raw JSON arguments, exactly as the model wrote them. */
  arguments: string
}

/** One turn of a conversation, in the shape every provider expects. */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  /** Set on an assistant turn that asked for tools. */
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[]
  /** Set on a tool result, matching the call it answers. */
  tool_call_id?: string
  name?: string
}

export interface StreamOptions {
  signal?: AbortSignal
  onToken?: (text: string) => void
  /** Function definitions the model may call, in OpenAI's shape. */
  tools?: unknown[]
  /**
   * 0 by default. A reading is an interpretation of fixed facts, so the same
   * draw should read the same way; sampling is what makes it feel random.
   */
  temperature?: number
}

export interface StreamResult {
  text: string
  toolCalls: ToolCallRequest[]
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

/** Streams a reading from an OpenAI-compatible endpoint. Resolves to the full text. */
export async function chatWithEndpoint(settings: ModelSettings, request: ChatRequest, fetchImpl: typeof fetch = fetch): Promise<string> {
  return streamMessages(
    settings,
    [
      { role: 'system', content: request.system },
      { role: 'user', content: request.user },
    ],
    { signal: request.signal, onToken: request.onToken },
    fetchImpl,
  )
}

/** Streams a whole conversation, returning the text and any tools requested. */
export async function streamMessagesFull(settings: ModelSettings, messages: ChatMessage[], options: StreamOptions = {}, fetchImpl: typeof fetch = fetch): Promise<StreamResult> {
  if (!settings.endpointEnabled || !settings.endpointUrl) throw new ModelUnavailable('endpoint disabled')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (settings.endpointToken) headers.Authorization = `Bearer ${settings.endpointToken}`
  const controller = new AbortController()
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  const stop = () => {
    controller.abort(options.signal?.reason)
    void reader?.cancel().catch(() => {})
  }
  options.signal?.addEventListener('abort', stop, { once: true })
  if (options.signal?.aborted) stop()
  const deadline = setTimeout(() => {
    controller.abort(new ModelUnavailable('reading timed out'))
    void reader?.cancel().catch(() => {})
  }, 45_000)
  try {
  controller.signal.throwIfAborted()
  const response = await fetchImpl(chatUrl(settings.endpointUrl), {
    method: 'POST',
    headers,
    signal: controller.signal,
    body: JSON.stringify({
      model: settings.model,
      stream: true,
      temperature: options.temperature ?? 0,
      messages,
      // One tool at a time: a reading that needs two draws should ask twice,
      // so each result is read before the next is requested.
      ...(options.tools ? { tools: options.tools, tool_choice: 'auto', parallel_tool_calls: false } : {}),
    }),
  })
  if (!response.ok || !response.body) throw new ModelUnavailable(`endpoint answered ${response.status}`)
  reader = response.body.getReader()
  const decoder = new TextDecoder()
  const calls: { id: string; name: string; arguments: string }[] = []
  let buffer = ''
  let text = ''
  let thinking = false
  for (;;) {
    const { value, done } = await reader.read()
    controller.signal.throwIfAborted()
    if (done) throw new ModelUnavailable('reading stream interrupted')
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') {
        const result = { text: stripThinking(text), toolCalls: calls.filter(call => call.name) }
        if (!result.text && !result.toolCalls.length) throw new ModelUnavailable('empty reading')
        return result
      }
      let chunk: {
          error?: unknown
          choices?: { delta?: { content?: string; tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[] } }[]
      }
      try { chunk = JSON.parse(payload) } catch { continue }
      if (chunk.error) throw new ModelUnavailable('reading service error')
        // Tool calls stream in pieces, one index per call.
        for (const part of chunk.choices?.[0]?.delta?.tool_calls ?? []) {
          const at = part.index ?? calls.length
          calls[at] ??= { id: part.id ?? `call_${at}`, name: '', arguments: '' }
          if (part.id) calls[at].id = part.id
          if (part.function?.name) calls[at].name += part.function.name
          if (part.function?.arguments) calls[at].arguments += part.function.arguments
        }
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
        options.onToken?.(visible)

    }
  }
  } finally {
    clearTimeout(deadline)
    options.signal?.removeEventListener('abort', stop)
    void reader?.cancel().catch(() => {})
  }
}

/** The text of a conversation, for callers that do not use tools. */
export async function streamMessages(settings: ModelSettings, messages: ChatMessage[], options: StreamOptions = {}, fetchImpl: typeof fetch = fetch): Promise<string> {
  return (await streamMessagesFull(settings, messages, options, fetchImpl)).text
}

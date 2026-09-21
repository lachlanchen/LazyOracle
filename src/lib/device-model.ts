/**
 * On-device language model through wllama (llama.cpp compiled to WebAssembly).
 * It runs the same GGUF files the native shells will use, inside the web view
 * on every platform, so a reading never has to leave the device. The model is
 * downloaded once from our host and cached by the browser's Cache API; the
 * user chooses the size in Settings.
 */
import type { ChatRequest } from './llm'

export interface DeviceModelOption {
  id: string
  name: string
  /** Approximate download size in MB, shown before downloading. */
  sizeMb: number
  url: string
  /** Same file on a mirror reachable from mainland China. */
  mirror: string
  /** Rough quality note shown in Settings. */
  note: { en: string; zh: string }
}

export const DEVICE_MODELS: DeviceModelOption[] = [
  {
    id: 'qwen3-0.6b-q8',
    name: 'Qwen3 0.6B',
    sizeMb: 640,
    url: 'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf',
    mirror: 'https://hf-mirror.com/Qwen/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf',
    note: { en: 'Fast on any phone; short readings.', zh: '任何手机都很快；解读较短。' },
  },
  {
    id: 'qwen3-1.7b-q4',
    name: 'Qwen3 1.7B',
    sizeMb: 1100,
    url: 'https://huggingface.co/Qwen/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf',
    mirror: 'https://hf-mirror.com/Qwen/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf',
    note: { en: 'Better readings; needs a recent phone.', zh: '解读更好；需要较新的手机。' },
  },
]

const SELECTED_KEY = 'lazyoracle.deviceModel'

export function selectedDeviceModel(): DeviceModelOption | null {
  try {
    const id = localStorage.getItem(SELECTED_KEY)
    return DEVICE_MODELS.find((m) => m.id === id) ?? null
  } catch {
    return null
  }
}

export function selectDeviceModel(id: string | null): void {
  try {
    if (id) localStorage.setItem(SELECTED_KEY, id)
    else localStorage.removeItem(SELECTED_KEY)
  } catch {
    // ignore
  }
}

type WllamaInstance = {
  loadModelFromUrl: (url: string, options: Record<string, unknown>) => Promise<void>
  createChatCompletion: (options: Record<string, unknown>) => Promise<unknown>
  exit: () => Promise<void>
}

let instance: WllamaInstance | null = null
let loadedId: string | null = null
let loading: Promise<void> | null = null

export function deviceModelReady(): boolean {
  return Boolean(instance && loadedId && selectedDeviceModel()?.id === loadedId)
}

export function deviceModelLoadedId(): string | null {
  return loadedId
}

/** Loads (downloading if needed) the selected model; progress in 0–1. */
export async function loadDeviceModel(option: DeviceModelOption, onProgress?: (fraction: number) => void): Promise<void> {
  if (loadedId === option.id && instance) return
  if (loading) await loading
  if (loadedId === option.id && instance) return
  loading = (async () => {
    const { Wllama } = await import('@wllama/wllama')
    const base = `${import.meta.env.BASE_URL}wllama/`
    if (instance) {
      await instance.exit().catch(() => undefined)
      instance = null
      loadedId = null
    }
    const wllama = new Wllama({
      default: `${base}wllama.wasm`,
      'single-thread/wllama.wasm': `${base}wllama.wasm`,
      'multi-thread/wllama.wasm': `${base}wllama.wasm`,
    }) as unknown as WllamaInstance
    const params = {
      n_ctx: 4096,
      progressCallback: ({ loaded, total }: { loaded: number; total: number }) => onProgress?.(total ? loaded / total : 0),
    }
    try {
      await wllama.loadModelFromUrl(option.url, params)
    } catch (error) {
      console.warn('primary model host failed, trying the mirror', error)
      await wllama.loadModelFromUrl(option.mirror, params)
    }
    instance = wllama
    loadedId = option.id
  })()
  try {
    await loading
  } finally {
    loading = null
  }
}

export async function unloadDeviceModel(): Promise<void> {
  if (instance) await instance.exit().catch(() => undefined)
  instance = null
  loadedId = null
}

/** Streams a completion from the loaded on-device model. */
export async function chatOnDevice(request: ChatRequest): Promise<string> {
  if (!instance) throw new Error('no on-device model loaded')
  let full = ''
  let visible = ''
  let thinking = false
  await instance.createChatCompletion({
    messages: [
      { role: 'system', content: request.system },
      { role: 'user', content: `${request.user}\n/no_think` },
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 700,
    cache_prompt: true,
    abortSignal: request.signal,
    onData: (chunk: { choices?: { delta?: { content?: string | null } }[] }) => {
      const delta = chunk.choices?.[0]?.delta?.content ?? ''
      if (!delta) return
      full += delta
      let shown = full
      if (shown.includes('<think>')) {
        if (!shown.includes('</think>')) {
          thinking = true
          return
        }
        shown = shown.slice(shown.indexOf('</think>') + 8)
      }
      thinking = false
      if (shown.length > visible.length) {
        request.onToken?.(shown.slice(visible.length))
        visible = shown
      }
    },
  })
  void thinking
  return full.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim()
}

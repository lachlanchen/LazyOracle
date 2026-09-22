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
  name: { en: string; zh: string }
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
    id: 'tianji-fast',
    name: { en: 'Tianji Fast', zh: '天机快速版' },
    sizeMb: 640,
    url: 'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf',
    mirror: 'https://hf-mirror.com/Qwen/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf',
    note: { en: 'Runs on any phone; short readings, fully offline.', zh: '任何手机都能跑；解读较短，完全离线。' },
  },
  {
    id: 'tianji-pro',
    name: { en: 'Tianji Pro', zh: '天机专业版' },
    sizeMb: 1100,
    url: 'https://huggingface.co/Qwen/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf',
    mirror: 'https://hf-mirror.com/Qwen/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf',
    note: { en: 'Fuller readings; needs a recent phone, fully offline.', zh: '解读更完整；需要较新的手机，完全离线。' },
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
  /** Points wllama at the Safari-compatible build; we host it ourselves. */
  setCompat: (compat: { worker: string; wasm: string } | null, mode?: 'safari' | 'firefox_safari') => void
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
    // Safari, and therefore every web view on iOS, cannot run the default
    // build (it needs WebAssembly Memory64 and JSPI). wllama then switches to
    // a compatibility build, which it fetches from a public CDN by default.
    // We serve that build from our own origin instead, so the app keeps
    // working under its content security policy and with no third party.
    wllama.setCompat({ worker: `${base}compat/wllama.js`, wasm: `${base}compat/wllama.wasm` })
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

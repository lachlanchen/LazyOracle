/**
 * On-device language model through wllama (llama.cpp compiled to WebAssembly).
 * It runs the same GGUF files the native shells will use, inside the web view
 * on every platform, so a reading never has to leave the device. The model is
 * downloaded once from Hugging Face and cached on the device; the user
 * chooses the size in Settings. Both are Unsloth dynamic quantisations, which
 * keep the sensitive layers at higher precision and so read noticeably better
 * than a plain four-bit file of the same size.
 */
import type { ChatMessage, ChatRequest, StreamOptions } from './llm'

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
  /** Context window. Small, because the KV cache is what exhausts a phone. */
  contextTokens: number
}

/** Progress phases, so a bar that restarts at zero is explained rather than alarming. */
export type LoadPhase = 'download' | 'prepare'
export type LoadProgress = (fraction: number, phase: LoadPhase) => void

export const DEVICE_MODELS: DeviceModelOption[] = [
  {
    id: 'tianji-mini',
    name: { en: 'Tianji Mini', zh: '天机轻量版' },
    sizeMb: 302,
    url: 'https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-UD-Q2_K_XL.gguf',
    mirror: 'https://hf-mirror.com/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-UD-Q2_K_XL.gguf',
    note: {
      en: 'For phones with little memory to spare, such as an iPhone SE. Shorter, plainer readings.',
      zh: '适合内存较小的手机（例如 iPhone SE）。解读更短、更朴素。',
    },
    contextTokens: 1024,
  },
  {
    id: 'tianji-fast',
    name: { en: 'Tianji Fast', zh: '天机快速版' },
    sizeMb: 405,
    url: 'https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-UD-Q4_K_XL.gguf',
    mirror: 'https://hf-mirror.com/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-UD-Q4_K_XL.gguf',
    note: { en: 'Quick readings on any phone. Downloaded once, then it works with no network at all.', zh: '在任何手机上都跑得动，解读简短。下载一次之后完全离线可用。' },
    contextTokens: 2048,
  },
  {
    id: 'tianji-pro',
    name: { en: 'Tianji Pro', zh: '天机专业版' },
    sizeMb: 1135,
    url: 'https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-UD-Q4_K_XL.gguf',
    mirror: 'https://hf-mirror.com/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-UD-Q4_K_XL.gguf',
    note: { en: 'Fuller, more careful readings. Best on a newer phone with plenty of memory.', zh: '解读更完整、更细致。建议在内存较大的较新手机上使用。' },
    contextTokens: 2048,
  },
]

const SELECTED_KEY = 'lazyoracle.deviceModel'
/**
 * Written just before a model is handed to the runtime and cleared once it is
 * running. If it survives a restart, the last attempt took the whole web view
 * down with it (a phone running out of memory looks like a white screen and a
 * reload), so the app must not try that model again by itself.
 */
const ATTEMPT_KEY = 'lazyoracle.deviceModel.attempt'
/** Remembers which model's last start crashed, so the interface can say so. */
const CRASHED_KEY = 'lazyoracle.deviceModel.crashed'

function markAttempt(id: string | null): void {
  try {
    if (id) localStorage.setItem(ATTEMPT_KEY, id)
    else localStorage.removeItem(ATTEMPT_KEY)
  } catch {
    // Storage may be blocked; the guard is then simply unavailable.
  }
}

/** The model whose last load crashed the app, if any. */
export function crashedDeviceModelId(): string | null {
  try {
    return localStorage.getItem(ATTEMPT_KEY)
  } catch {
    return null
  }
}

/**
 * Called once at startup. If a previous load crashed, the model is deselected
 * and its id returned so the interface can explain what happened; otherwise
 * null. Nothing is loaded here.
 */
export function takeCrashedDeviceModel(): DeviceModelOption | null {
  const id = crashedDeviceModelId()
  if (!id) return null
  markAttempt(null)
  selectDeviceModel(null)
  try {
    localStorage.setItem(CRASHED_KEY, id)
  } catch {
    // Without storage the cache simply is not purged on the next attempt.
  }
  return DEVICE_MODELS.find((m) => m.id === id) ?? null
}

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
  cacheManager: { delete: (url: string) => Promise<void> }
  loadModelFromUrl: (url: string, options: Record<string, unknown>) => Promise<void>
  createChatCompletion: (options: Record<string, unknown>) => Promise<unknown>
  exit: () => Promise<void>
}

let instance: WllamaInstance | null = null
let loadedId: string | null = null
let loading: Promise<void> | null = null

/**
 * The models whose files are already on the device and pass the runtime's own
 * validation. A model in this list costs nothing to start, so the interface
 * must offer to use it rather than to download it again.
 */
export async function downloadedModelIds(): Promise<string[]> {
  try {
    const { ModelManager } = await import('@wllama/wllama')
    const cached = await new ModelManager().getModels()
    const urls = new Set(cached.map((model) => model.url))
    return DEVICE_MODELS.filter((option) => urls.has(option.url) || urls.has(option.mirror)).map((option) => option.id)
  } catch {
    return []
  }
}

export function deviceModelReady(): boolean {
  return Boolean(instance && loadedId && selectedDeviceModel()?.id === loadedId)
}

export function deviceModelLoadedId(): string | null {
  return loadedId
}

/** Loads (downloading if needed) the selected model; progress in 0–1. */
/** Thrown when the device plainly cannot hold the model. */
export class ModelTooLarge extends Error {}

/**
 * Asks the browser to reserve as much memory as the model will need, and
 * gives it straight back.
 *
 * This matters most on iPhones. A web view gets far less memory than the
 * phone has, and loading a model briefly needs several times the file: the
 * bytes read from storage, a copy passed to the worker (Safari on iOS cannot
 * transfer a buffer, so it clones it), and the copy the runtime keeps. When
 * that exceeds the limit the system kills the web view, which the reader sees
 * as a white screen and a reload, with no error anywhere. Reserving the space
 * first turns that into a sentence we can show instead.
 *
 * The reservation is not touched, so it costs nothing when it succeeds.
 */
export async function canHoldModel(option: DeviceModelOption): Promise<boolean> {
  // Loading needs the file about three times over on iOS (read, clone to the
  // worker, and the runtime's own copy), so ask for a little over twice it.
  const needed = Math.ceil(option.sizeMb * 2.2 * 1024 * 1024)
  try {
    const memory = new WebAssembly.Memory({ initial: Math.ceil(needed / 65536) })
    return memory.buffer.byteLength >= needed
  } catch {
    return false
  }
}

/**
 * Refuses a download the device cannot finish. A half-written model file is
 * the worst outcome: the runtime rejects it, downloads it again, and the app
 * spins. Browsers report their quota, so ask first.
 */
async function checkRoom(option: DeviceModelOption): Promise<void> {
  try {
    const estimate = await navigator.storage?.estimate?.()
    if (!estimate || typeof estimate.quota !== 'number') return
    const free = estimate.quota - (estimate.usage ?? 0)
    const needed = option.sizeMb * 1024 * 1024 * 1.25
    if (free < needed) {
      throw new ModelTooLarge(`needs about ${Math.ceil(needed / 1024 / 1024)} MB of free space, ${Math.floor(free / 1024 / 1024)} MB available`)
    }
  } catch (error) {
    if (error instanceof ModelTooLarge) throw error
    // The estimate is advisory; if the browser will not give one, carry on.
  }
}

export async function loadDeviceModel(option: DeviceModelOption, onProgress?: LoadProgress): Promise<void> {
  if (loadedId === option.id && instance) return
  if (loading) await loading
  if (loadedId === option.id && instance) return
  loading = (async () => {
    await checkRoom(option)
    if (!(await canHoldModel(option))) {
      throw new ModelTooLarge(`this device cannot hold ${option.sizeMb} MB in one piece`)
    }
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
    // A phone has to hold the weights and the KV cache at once, so the context
    // stays small and only a few threads are used. Too large a context is what
    // makes the web view run out of memory and reload.
    const threads = Math.max(1, Math.min(4, Math.floor((navigator.hardwareConcurrency || 2) / 2)))
    let downloaded = false
    const cachedAlready = (await downloadedModelIds()).includes(option.id)
    if (cachedAlready) {
      downloaded = true
      markAttempt(option.id)
      onProgress?.(1, 'prepare')
    }
    const params = {
      n_ctx: option.contextTokens,
      n_batch: 128,
      n_threads: threads,
      // The runtime offloads every layer to the GPU unless told otherwise.
      // On a phone that asks the GPU process for several hundred megabytes,
      // and when it is refused the whole web view is killed: the page goes
      // white and reloads. The models here are small enough to read fluently
      // on the processor, so the GPU is left alone.
      n_gpu_layers: 0,
      progressCallback: ({ loaded, total }: { loaded: number; total: number }) => {
        const fraction = total ? loaded / total : 0
        onProgress?.(fraction, 'download')
        // The runtime starts once the file is in place; that stage has no
        // progress of its own, so it is announced rather than shown as 0%.
        if (fraction >= 1 && !downloaded) {
          downloaded = true
          // From here on the runtime is starting, which is the step that can
          // take the whole web view down with it on a small phone. Only now
          // is the attempt recorded, so an interrupted download is not
          // mistaken for a crash.
          markAttempt(option.id)
          onProgress?.(1, 'prepare')
        }
      },
    }
    try {
      await wllama.loadModelFromUrl(option.url, params)
    } catch (error) {
      // The mirror is for a download that could not finish. Once the file is
      // here, a failure comes from starting the model, and downloading the
      // same gigabyte again would only repeat it.
      if (downloaded) throw error
      console.warn('primary model host failed, trying the mirror', error)
      await wllama.loadModelFromUrl(option.mirror, params)
    }
    markAttempt(null)
    instance = wllama
    loadedId = option.id
  })()
  try {
    await loading
  } catch (error) {
    // A clean failure (a 404, no network, no room) is not a crash, so the
    // guard is lifted and the user can try again.
    markAttempt(null)
    throw error
  } finally {
    loading = null
  }
}

export async function unloadDeviceModel(): Promise<void> {
  markAttempt(null)
  if (instance) await instance.exit().catch(() => undefined)
  instance = null
  loadedId = null
}

/** Streams a reading from the loaded on-device model. */
export async function chatOnDevice(request: ChatRequest): Promise<string> {
  return streamOnDevice(
    [
      { role: 'system', content: request.system },
      { role: 'user', content: `${request.user}\n/no_think` },
    ],
    { signal: request.signal, onToken: request.onToken },
  )
}

/** Streams a whole conversation from the loaded on-device model. */
export async function streamOnDevice(messages: ChatMessage[], options: StreamOptions = {}): Promise<string> {
  if (!instance) throw new Error('no on-device model loaded')
  let full = ''
  let visible = ''
  await instance.createChatCompletion({
    messages,
    stream: true,
    // Greedy, for the same reason as the cloud path: fixed facts, fixed reading.
    temperature: options.temperature ?? 0,
    max_tokens: 700,
    cache_prompt: true,
    abortSignal: options.signal,
    onData: (chunk: { choices?: { delta?: { content?: string | null } }[] }) => {
      const delta = chunk.choices?.[0]?.delta?.content ?? ''
      if (!delta) return
      full += delta
      let shown = full
      // Qwen3 reasons inside <think>; nothing of it is shown.
      if (shown.includes('<think>')) {
        if (!shown.includes('</think>')) return
        shown = shown.slice(shown.indexOf('</think>') + 8)
      }
      if (shown.length > visible.length) {
        options.onToken?.(shown.slice(visible.length))
        visible = shown
      }
    },
  })
  return full.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim()
}

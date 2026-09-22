// The device check page's logic. It lives in its own file because the site's
// content security policy allows scripts only from this origin, not inline.
const $ = (id) => document.getElementById(id)
const log = (line) => { $('log').textContent += line + '\n'; console.log('[check]', line) }
const MODELS = {
  mini: { name: 'Tianji Mini (Qwen3 0.6B UD-Q2_K_XL, ~302 MB)', url: 'https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-UD-Q2_K_XL.gguf' },
  fast: { name: 'Tianji Fast (Qwen3 0.6B UD-Q4_K_XL, ~405 MB)', url: 'https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-UD-Q4_K_XL.gguf' },
  pro:  { name: 'Tianji Pro (Qwen3 1.7B UD-Q4_K_XL, ~1.1 GB)',  url: 'https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-UD-Q4_K_XL.gguf' },
  tiny: { name: 'Tiny stand-in (stories15M, ~19 MB)',            url: 'https://huggingface.co/ggml-org/models/resolve/main/tinyllamas/stories15M-q4_0.gguf' },
}
const choice = new URLSearchParams(location.search).get('model') || 'fast'
const model = MODELS[choice] || MODELS.fast

$('ua').textContent = navigator.userAgent.slice(0, 48) + '…'
const hasJSPI = Boolean(WebAssembly.Suspending)
let hasMem64 = false
try { new WebAssembly.Memory({ address: 'i64', initial: 1n }); hasMem64 = true } catch { hasMem64 = false }
$('jspi').innerHTML = hasJSPI ? '<span class="ok">yes</span>' : '<span class="bad">no</span>'
$('mem64').innerHTML = hasMem64 ? '<span class="ok">yes</span>' : '<span class="bad">no</span>'
$('build').textContent = hasJSPI && hasMem64 ? 'default' : 'compatibility (self-hosted)'
$('model').textContent = model.name

try {
  const estimate = await navigator.storage?.estimate?.()
  if (estimate?.quota) $('quota').textContent = `${Math.round((estimate.quota - (estimate.usage || 0)) / 1048576)} MB of ${Math.round(estimate.quota / 1048576)} MB`
} catch { $('quota').textContent = 'unknown' }

// How large a single block this browser will reserve. On a phone this is the
// real ceiling for an on-device model, and it is far below the phone's RAM.
function reservable(mb) {
  try {
    const memory = new WebAssembly.Memory({ initial: Math.ceil((mb * 1024 * 1024) / 65536) })
    return memory.buffer.byteLength >= mb * 1024 * 1024
  } catch {
    return false
  }
}
let low = 0
let high = 4096
while (high - low > 32) {
  const mid = Math.floor((low + high) / 2)
  if (reservable(mid)) low = mid
  else high = mid
}
$('ceiling').textContent = `${low} MB in one block`
log(`largest reservable block: ${low} MB`)

const started = Date.now()
const since = () => `${((Date.now() - started) / 1000).toFixed(1)}s`

try {
  log('loading the runtime')
  const { Wllama } = await import('/wllama/esm/index.js').catch(() => import('https://cdn.jsdelivr.net/npm/@wllama/wllama@3.6.1/esm/index.js'))
  const wllama = new Wllama({ default: '/wllama/wllama.wasm' })
  wllama.setCompat({ worker: '/wllama/compat/wllama.js', wasm: '/wllama/compat/wllama.wasm' })
  log('runtime ready, starting the download')
  $('state').textContent = 'Downloading…'
  await wllama.loadModelFromUrl(model.url, {
    n_ctx: 2048,
    n_batch: 128,
    n_threads: Math.max(1, Math.min(4, Math.floor((navigator.hardwareConcurrency || 2) / 2))),
    n_gpu_layers: 0,
    progressCallback: ({ loaded, total }) => {
      const pct = total ? Math.round((loaded / total) * 100) : 0
      $('fill').style.width = pct + '%'
      $('state').textContent = pct >= 100 ? `Preparing the model… (${since()})` : `Downloading ${pct}% (${since()})`
    },
  })
  log(`model loaded at ${since()}`)
  $('state').textContent = `Loaded in ${since()}. Writing a sentence…`
  let text = ''
  await wllama.createChatCompletion({
    messages: [
      { role: 'system', content: 'You are a calm oracle. Answer in one short sentence.' },
      { role: 'user', content: 'The Tower, reversed, in the position of the present. What does it suggest?\n/no_think' },
    ],
    stream: true,
    max_tokens: 90,
    onData: (chunk) => {
      text += chunk.choices?.[0]?.delta?.content ?? ''
      $('out').textContent = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim() || '…'
    },
  })
  $('state').innerHTML = `<span class="ok">Everything works.</span> Total ${since()}.`
  log('completion finished, total ' + since())
} catch (error) {
  $('state').innerHTML = `<span class="bad">Failed:</span> ${error && error.message ? error.message : error}`
  log('FAILED ' + (error && error.stack ? error.stack : error))
}

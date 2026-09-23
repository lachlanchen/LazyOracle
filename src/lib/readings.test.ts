import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MODEL_SETTINGS, loadModelSettings, ModelUnavailable } from './llm'
import { chatAvailable, generateChat, generateReading, type ReadingUpdate } from './readings'

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

function stubReply(text: string) {
  const fetcher = vi.fn(async () => new Response(
    `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`,
    { status: 200 },
  ))
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

function reading() {
  return new Promise<ReadingUpdate>((resolve) => generateReading({
    system: 'Read only the computed facts.', user: 'A real draw.',
    offline: 'The deterministic reading.', signal: new AbortController().signal,
  }, (update) => { if (update.done) resolve(update) }))
}

describe('cloud reading rollout', () => {
  it.each(['https://oracle.lazying.art', 'https://oracle-fast.lazying.art'])(
    'uses the same-origin relay on %s so CSP permits the request', async (origin) => {
      vi.stubGlobal('location', { origin })
      vi.resetModules()
      const { DEFAULT_MODEL_SETTINGS: hostedSettings } = await import('./llm')
      expect(hostedSettings.endpointUrl).toBe(`${origin}/v1`)
    },
  )

  it('uses Tianji Fast on the Huanayun relay on first launch', async () => {
    const fetcher = stubReply('A grounded reading.')
    expect(await reading()).toEqual({ source: 'model', text: 'A grounded reading.', done: true })
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://oracle-fast.lazying.art/v1/chat/completions')
    expect(JSON.parse(options.body as string).model).toBe('tianji-fast')
  })

  it('ignores retired endpoints, credentials and local-model tiers after an upgrade', async () => {
    localStorage.setItem('lazyoracle.model', JSON.stringify({
      endpointEnabled: true, endpointUrl: 'http://localhost:11434/v1',
      endpointToken: 'old-test-token', model: 'tianji-mini',
    }))
    expect(loadModelSettings()).toEqual(DEFAULT_MODEL_SETTINGS)
    const fetcher = stubReply('The cloud answer.')
    await generateChat([{ role: 'user', content: 'Hello' }], () => {})
    const [, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(options.headers).not.toHaveProperty('Authorization')
    expect(JSON.parse(options.body as string).model).toBe('tianji-fast')
  })

  it('respects an existing cloud opt-out without making a network request', async () => {
    localStorage.setItem('lazyoracle.model', JSON.stringify({ endpointEnabled: false }))
    const fetcher = stubReply('Must not be requested.')
    expect(chatAvailable()).toBe(false)
    expect(await reading()).toEqual({ source: 'offline', text: 'The deterministic reading.', done: true })
    await expect(generateChat([{ role: 'user', content: 'Hello' }], () => {})).rejects.toBeInstanceOf(ModelUnavailable)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('keeps individual readings usable when the relay is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })))
    expect(await reading()).toEqual({ source: 'offline', text: 'The deterministic reading.', done: true })
  })
})

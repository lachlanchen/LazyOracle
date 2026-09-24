import { afterEach, expect, it, vi } from 'vitest'
import { DEFAULT_MODEL_SETTINGS, ModelUnavailable, streamMessagesFull } from './llm'

afterEach(() => vi.useRealTimers())
const request = [{ role: 'user' as const, content: 'Explain this reading' }]
const frame = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
function openStream(bytes: string) {
  const cancel = vi.fn()
  const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode(bytes)) }, cancel })
  const fetcher = vi.fn(async () => new Response(body))
  return { cancel, fetcher }
}
it('finishes at DONE even when the server keeps the connection open', async () => {
  const { cancel, fetcher } = openStream(frame('A complete answer.') + 'data: [DONE]\n\n')
  expect((await streamMessagesFull(DEFAULT_MODEL_SETTINGS, request, {}, fetcher)).text).toBe('A complete answer.')
  expect(cancel).toHaveBeenCalled()
})
it('bounds a stream that never sends another byte', async () => {
  vi.useFakeTimers()
  const { fetcher, cancel } = openStream(': keepalive\n\n')
  const pending = streamMessagesFull(DEFAULT_MODEL_SETTINGS, request, {}, fetcher)
  const check = expect(pending).rejects.toThrow('reading timed out')
  await vi.advanceTimersByTimeAsync(45_000)
  await check
  expect(cancel).toHaveBeenCalled()
})
it('cancels a blocked reader when Stop is pressed', async () => {
  const { fetcher, cancel } = openStream(': keepalive\n\n')
  const controller = new AbortController()
  const pending = streamMessagesFull(DEFAULT_MODEL_SETTINGS, request, { signal: controller.signal }, fetcher)
  await Promise.resolve(); await Promise.resolve()
  controller.abort()
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  expect(cancel).toHaveBeenCalled()
})
it.each([frame('Partial answer'), 'data: {"error":{"message":"upstream failed"}}\n\n', 'data: [DONE]\n\n'])(
  'rejects incomplete, error, or empty streams', async body => {
    await expect(streamMessagesFull(DEFAULT_MODEL_SETTINGS, request, {}, async () => new Response(body))).rejects.toBeInstanceOf(ModelUnavailable)
  },
)

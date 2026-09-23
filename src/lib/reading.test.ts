import { describe, expect, it, vi } from 'vitest'
import { drawSpread } from '../engines/tarot/draw'
import { chatWithEndpoint, DEFAULT_MODEL_SETTINGS, ModelUnavailable, stripThinking } from './llm'
import { fitToBudget } from './readings'
import { offlineReading, systemPrompt, tarotContext, userPrompt } from './reading'

describe('reading context', () => {
  const draw = drawSpread('three', { seed: 42, question: 'Should I take the new job?', now: new Date(0) })

  it('exposes exactly the drawn cards with their position, orientation and keywords', () => {
    const context = tarotContext(draw, 'en')
    expect(context.cards).toHaveLength(3)
    expect(context.cards.map((c) => c.position)).toEqual(['Past', 'Present', 'Future'])
    for (const [index, item] of context.cards.entries()) {
      const drawn = draw.cards[index]
      expect(item.card).toBe(drawn.card.text.en.name)
      expect(item.orientation).toBe(drawn.orientation)
      expect(item.keywords).toEqual(drawn.card.text.en[drawn.orientation])
    }
    expect(userPrompt(context)).toContain('Should I take the new job?')
    expect(systemPrompt('zh-Hans')).toContain('Simplified Chinese')
  })

  it('switches card names to Chinese for the Chinese interfaces', () => {
    const context = tarotContext(draw, 'zh-Hans')
    expect(context.spread).toBe('过去 · 现在 · 未来')
    expect(context.cards[0].card).toBe(draw.cards[0].card.text.zh.name)
  })

  it('composes an offline reading that names every card and its orientation', () => {
    const context = tarotContext(draw, 'en')
    const text = offlineReading(context)
    for (const item of context.cards) {
      expect(text).toContain(item.card)
      expect(text).toContain(item.position)
      if (item.orientation === 'reversed') expect(text).toContain('reversed')
    }
    expect(offlineReading(tarotContext(draw, 'zh-Hans'))).toContain('牌阵')
  })
})

describe('endpoint client', () => {
  it('refuses when the endpoint is disabled', async () => {
    await expect(chatWithEndpoint({ ...DEFAULT_MODEL_SETTINGS, endpointEnabled: false }, { system: 's', user: 'u' })).rejects.toBeInstanceOf(ModelUnavailable)
    expect(DEFAULT_MODEL_SETTINGS.endpointUrl).toBe('https://oracle-fast.lazying.art/v1')
    // The reader works the first time the app is opened, without a switch.
    expect(DEFAULT_MODEL_SETTINGS.endpointEnabled).toBe(true)
  })

  it('streams OpenAI-style chunks, hides <think> blocks, and returns the text', async () => {
    const chunks = [
      'data: {"choices":[{"delta":{"content":"<think>plan"}}]}\n',
      'data: {"choices":[{"delta":{"content":"ning</think>The "}}]}\n',
      'data: {"choices":[{"delta":{"content":"Fool opens"}}]}\n\n',
      'data: [DONE]\n',
    ]
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk))
        controller.close()
      },
    })
    const fetchImpl = vi.fn(async () => new Response(stream, { status: 200 }))
    const tokens: string[] = []
    const text = await chatWithEndpoint(
      { ...DEFAULT_MODEL_SETTINGS, endpointEnabled: true, endpointUrl: 'http://example.test/v1', endpointToken: 'abc' },
      { system: 's', user: 'u', onToken: (t) => tokens.push(t) },
      fetchImpl as unknown as typeof fetch,
    )
    expect(text).toBe('The Fool opens')
    expect(tokens.join('')).toBe('The Fool opens')
    const call = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(call[0]).toBe('http://example.test/v1/chat/completions')
    expect((call[1].headers as Record<string, string>).Authorization).toBe('Bearer abc')
    expect(stripThinking('<think>x</think>  hello')).toBe('hello')
  })
})

describe('conversation context', () => {
  it('keeps the newest turns and hands back the rest to be summarised', () => {
    const turns = Array.from({ length: 12 }, (_, index) => ({ content: `turn number ${index} with some words in it` }))
    const { keep, older } = fitToBudget(turns, 200)
    expect(keep.length + older.length).toBe(12)
    // The kept turns are the most recent ones, and they fit the budget.
    expect(keep[keep.length - 1]).toBe(turns[11])
    expect(keep.reduce((sum, turn) => sum + turn.content.length + 16, 0)).toBeLessThanOrEqual(200 + 60)
    expect(older[0]).toBe(turns[0])
  })

  it('never sends an empty conversation, however tight the budget', () => {
    const turns = [{ content: 'x'.repeat(500) }, { content: 'y'.repeat(500) }]
    const { keep } = fitToBudget(turns, 10)
    expect(keep).toHaveLength(2)
  })

  it('leaves a short conversation untouched', () => {
    const turns = [{ content: 'hello' }, { content: 'there' }]
    const { keep, older } = fitToBudget(turns, 16000)
    expect(keep).toHaveLength(2)
    expect(older).toHaveLength(0)
  })
})

import { describe, expect, it, vi } from 'vitest'
import { drawSpread } from '../engines/tarot/draw'
import { chatWithEndpoint, DEFAULT_MODEL_SETTINGS, ModelUnavailable, stripThinking } from './llm'
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
    expect(systemPrompt('zh-Hant')).toContain('Traditional Chinese')
  })

  it('switches card names to Chinese for the Chinese interfaces', () => {
    const context = tarotContext(draw, 'zh-Hans')
    expect(context.spread).toBe('过去 · 现在 · 未来')
    expect(context.cards[0].card).toBe(draw.cards[0].card.text.zh.name)
  })

  it('shows Traditional characters for the Traditional and Cantonese interfaces', () => {
    const context = tarotContext(draw, 'zh-Hant')
    expect(context.spread).toBe('過去 · 現在 · 未來')
    expect(offlineReading(tarotContext(draw, 'yue'))).not.toMatch(/[圣权币过对宝剑]/)
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
    await expect(chatWithEndpoint(DEFAULT_MODEL_SETTINGS, { system: 's', user: 'u' })).rejects.toBeInstanceOf(ModelUnavailable)
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

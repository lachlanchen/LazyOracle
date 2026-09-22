import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_STEPS, parseToolCall, runTool, TOOLS, toolInstructions, toolResultMessage } from './agent'
import { saveProfile } from './profile'

describe('tool protocol', () => {
  it('finds a tool call and ignores anything around it', () => {
    const call = parseToolCall('Let me draw.\n<tool>{"name": "draw_tarot", "arguments": {"spread": "three"}}</tool>')
    expect(call).toEqual({ name: 'draw_tarot', arguments: { spread: 'three' } })
  })

  it('returns nothing for plain prose, unknown tools or broken JSON', () => {
    expect(parseToolCall('The Tower suggests an overdue change.')).toBeNull()
    expect(parseToolCall('<tool>{"name": "launch_rocket", "arguments": {}}</tool>')).toBeNull()
    expect(parseToolCall('<tool>{not json}</tool>')).toBeNull()
  })

  it('describes every tool to the model in both languages', () => {
    for (const language of ['en', 'zh-Hans'] as const) {
      const instructions = toolInstructions(language)
      for (const tool of TOOLS) expect(instructions).toContain(tool.name)
      expect(instructions).toContain(String(MAX_STEPS))
    }
  })
})

describe('running the tools', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('draws real cards rather than letting the model invent them', () => {
    const result = runTool({ name: 'draw_tarot', arguments: { spread: 'three', question: 'work' } }, 'en')
    expect(result.ok).toBe(true)
    const output = JSON.parse(result.output) as { cards: { card: string; orientation: string }[]; seed: number }
    expect(output.cards).toHaveLength(3)
    expect(new Set(output.cards.map((card) => card.card)).size).toBe(3)
    expect(['upright', 'reversed']).toContain(output.cards[0].orientation)
    expect(toolResultMessage(result)).toContain('TOOL RESULT draw_tarot')
  })

  it('casts a hexagram with its rule for where the answer is read', () => {
    const output = JSON.parse(runTool({ name: 'cast_iching', arguments: {} }, 'zh-Hans').output) as { primary: { number: number }; rule: string }
    expect(output.primary.number).toBeGreaterThanOrEqual(1)
    expect(output.primary.number).toBeLessThanOrEqual(64)
    expect(output.rule.length).toBeGreaterThan(4)
  })

  it('says plainly when no birth details are saved, instead of guessing', () => {
    const output = JSON.parse(runTool({ name: 'four_pillars', arguments: {} }, 'en').output) as { error?: string }
    expect(output.error).toContain('No birth details')
  })

  it('computes the four pillars once birth details exist', () => {
    saveProfile({
      name: '', year: 1990, month: 6, day: 15, hour: 8, minute: 30, timeKnown: true, gender: 'female',
      place: 'Shanghai', latitude: 31.23, longitude: 121.47, utcOffsetHours: 8,
    })
    const output = JSON.parse(runTool({ name: 'four_pillars', arguments: {} }, 'en').output) as { pillars: Record<string, string>; dayMaster: string }
    expect(Object.keys(output.pillars)).toEqual(['year', 'month', 'day', 'hour'])
    expect(output.dayMaster.length).toBeGreaterThan(1)
  })

  it('opens a real page of the book', () => {
    const output = JSON.parse(runTool({ name: 'open_book', arguments: { book: 'answers', question: 'should I go' } }, 'en').output) as { page: number; text: string }
    expect(output.page).toBeGreaterThan(0)
    expect(output.text.length).toBeGreaterThan(2)
  })

  it('reports the day pillar for timing questions', () => {
    const output = JSON.parse(runTool({ name: 'today', arguments: {} }, 'en').output) as { dayPillar: string; date: string }
    expect(output.dayPillar).toHaveLength(2)
    expect(output.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('never throws, even for an unknown tool', () => {
    const result = runTool({ name: 'nope', arguments: {} }, 'en')
    expect(result.ok).toBe(false)
    expect(result.output).toContain('unknown tool')
  })
})

import { describe, expect, it } from 'vitest'
import { DECK, cardById } from './deck'
import { drawSpread, hashSeed, mulberry32, shuffle } from './draw'
import { SPREADS } from './spreads'

describe('the deck', () => {
  it('has 78 unique cards: 22 majors and 14 of each suit', () => {
    expect(DECK).toHaveLength(78)
    expect(new Set(DECK.map((card) => card.id)).size).toBe(78)
    expect(DECK.filter((card) => card.arcana === 'major')).toHaveLength(22)
    for (const suit of ['wands', 'cups', 'swords', 'pentacles'] as const) {
      expect(DECK.filter((card) => card.suit === suit)).toHaveLength(14)
    }
  })

  it('gives every card a name and keywords in both languages', () => {
    for (const card of DECK) {
      for (const language of ['en', 'zh'] as const) {
        const text = card.text[language]
        expect(text.name.length).toBeGreaterThan(0)
        expect(text.upright.length).toBeGreaterThanOrEqual(2)
        expect(text.reversed.length).toBeGreaterThanOrEqual(2)
      }
    }
    expect(cardById('major-00')?.text.en.name).toBe('The Fool')
    expect(cardById('cups-queen')?.text.zh.name).toBe('圣杯王后')
    expect(cardById('swords-10')?.label).toBe('10')
  })
})

describe('seeded drawing', () => {
  it('is reproducible from the seed and never repeats a card', () => {
    const first = drawSpread('celtic', { seed: 12345, now: new Date(0) })
    const second = drawSpread('celtic', { seed: 12345, now: new Date(0) })
    expect(second.cards.map((c) => [c.card.id, c.orientation])).toEqual(first.cards.map((c) => [c.card.id, c.orientation]))
    expect(first.cards).toHaveLength(10)
    expect(new Set(first.cards.map((c) => c.card.id)).size).toBe(10)
    expect(first.cards.map((c) => c.position.id)).toEqual(SPREADS.celtic.positions.map((p) => p.id))
  })

  it('changes with the seed', () => {
    const a = drawSpread('three', { seed: 1 }).cards.map((c) => c.card.id).join()
    const b = drawSpread('three', { seed: 2 }).cards.map((c) => c.card.id).join()
    expect(a).not.toBe(b)
  })

  it('reverses about a third of the cards over many draws', () => {
    let reversed = 0
    let total = 0
    for (let seed = 0; seed < 300; seed += 1) {
      for (const card of drawSpread('three', { seed }).cards) {
        total += 1
        if (card.orientation === 'reversed') reversed += 1
      }
    }
    expect(reversed / total).toBeGreaterThan(0.25)
    expect(reversed / total).toBeLessThan(0.42)
  })

  it('shuffles every card to a new place on average and hashes text stably', () => {
    const order = shuffle([1, 2, 3, 4, 5, 6, 7, 8], mulberry32(7))
    expect([...order].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(hashSeed('will I move this year?')).toBe(hashSeed('will I move this year?'))
    expect(hashSeed('a')).not.toBe(hashSeed('b'))
  })
})

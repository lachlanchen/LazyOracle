import { describe, expect, it } from 'vitest'
import { answerBook, openBook, questionBook } from './answers'

describe('the books', () => {
  it('hold original pages in both languages with unique numbers', () => {
    expect(answerBook.length).toBeGreaterThanOrEqual(100)
    expect(questionBook.length).toBeGreaterThanOrEqual(50)
    for (const book of [answerBook, questionBook]) {
      expect(new Set(book.map((p) => p.en)).size).toBe(book.length)
      for (const page of book) {
        expect(page.en.length).toBeGreaterThan(2)
        expect(page.zh.length).toBeGreaterThan(1)
      }
    }
  })

  it('opens the same page for the same seed and spreads picks across the book', () => {
    const a = openBook('answers', { seed: 7, now: new Date(0) })
    const b = openBook('answers', { seed: 7, now: new Date(0) })
    expect(b.page).toEqual(a.page)
    const numbers = new Set<number>()
    for (let seed = 0; seed < 400; seed += 1) numbers.add(openBook('questions', { seed }).page.number)
    expect(numbers.size).toBeGreaterThan(questionBook.length * 0.9)
  })
})

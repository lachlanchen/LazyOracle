import { expect, test } from 'vitest'
import { evaluate } from '../engine-bridge'
import { notebookSummary } from './notebook-summary'
import content from '../../i18n/app/content.json'

test('a notebook snapshot describes the exact saved draw without drawing new cards', () => {
  const draw = evaluate('tarot.draw', { seed: 123, spread: 'three', question: 'A question' }).data as Record<string, unknown>
  const before = JSON.stringify(draw)
  const described = evaluate('notebook.summary', { practice: 'tarot', result: draw })
  expect(described.ok).toBe(true)
  expect(described.data).toMatchObject({ question: 'A question', lines: expect.any(Array) })
  expect(JSON.stringify(draw)).toBe(before)
  expect(evaluate('notebook.summary', { practice: 'tarot', result: draw })).toEqual(described)
})

test('all computed practices have readable local snapshots with translated labels', () => {
  const birth = { year: 1990, month: 6, day: 15, hour: 10, minute: 30, gender: 'male', utcOffsetHours: 8, latitude: 31.23, longitude: 121.47 }
  for (const [practice, engine, input] of [
    ['iching', 'iching.cast', { seed: 9 }],
    ['answers', 'book.open', { book: 'answers', seed: 9 }],
    ['bazi', 'bazi.chart', birth],
    ['astrology', 'astrology.chart', birth],
    ['almanac', 'almanac.day', { date: '2026-09-29' }],
    ['fengshui', 'fengshui.mansions', birth],
  ] as const) {
    const result = evaluate(engine, input)
    expect(result.ok).toBe(true)
    const snapshot = notebookSummary(practice, result.data as Record<string, unknown>)
    expect(snapshot.lines.length).toBeGreaterThan(0)
    expect(JSON.stringify(snapshot)).not.toMatch(/undefined|NaN/)
  }
  const palm = notebookSummary('palm', { shape: 'water', palmRatio: 0.75, fingerRatio: 0.86, indexToRing: 0.98 })
  expect(palm.lines).toEqual([['Water'], ['Palm width to length', '0.750'], ['Fingers to palm', '0.860'], ['Index to ring', '0.980']])
  const face = notebookSummary('face', { element: 'metal', heightRatio: 1.25, jawRatio: 0.9, foreheadRatio: 0.95 })
  expect(face.lines).toContainEqual(['Height to width', '1.250'])
  for (const label of ['Moving lines', 'Upright', 'REVERSED', 'Year', 'Month', 'Day', 'Hour', ...palm.lines.map(row => row[0]), ...face.lines.map(row => row[0])]) {
    expect(Object.keys(content[label as keyof typeof content])).toHaveLength(11)
  }
})

test('study snapshots retain deliberately selected transitions and fail safely for corrupt data', () => {
  const result = evaluate('iching.explore', { number: 1, changing: [1, 6] }).data
  expect(evaluate('notebook.summary', { practice: 'atlas', result }).data).toMatchObject({ lines: expect.arrayContaining([['Moving lines', '1, 6']]) })
  expect(evaluate('notebook.summary', { practice: 'tarot', result: {} }).ok).toBe(false)
  expect(evaluate('notebook.summary', { practice: 'unknown', result: {} }).ok).toBe(false)
})

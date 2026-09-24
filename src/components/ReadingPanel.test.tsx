// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { uiCopy } from '../i18n'
import { generateReading } from '../lib/readings'
import { ReadingPanel } from './ReadingPanel'

vi.mock('../lib/readings', () => ({ generateReading: vi.fn() }))
afterEach(cleanup)
beforeEach(() => {
  vi.mocked(generateReading).mockReset()
  vi.mocked(generateReading).mockImplementation((_request, emit) => {
    emit({ source: 'model', text: 'The original explanation.', done: true })
  })
})
const facts = JSON.stringify({ seed: 42, primary: { number: 11 }, resulting: { number: 12 }, changingPositions: [2] })
const props = { copy: uiCopy('en'), readingKey: 'iching-42-en', system: 'Write in English.\nStructure: quote every detail.\nLength: 400 words.', user: facts, offline: 'offline', header: 'I Ching' }

it('explains the displayed result through the backend without changing its seed or facts', () => {
  render(<ReadingPanel {...props} />)
  fireEvent.change(screen.getByTestId('reading-followup'), { target: { value: 'What should I do next?' } })
  fireEvent.click(screen.getByTestId('reading-explain'))
  const request = vi.mocked(generateReading).mock.calls.at(-1)![0]
  expect(request.forceCloud).toBe(true)
  expect(request.system).toContain("two or three short paragraphs")
  expect(request.system).not.toContain("Structure:")
  expect(request.system).not.toContain("Length:")
  expect(request.user.startsWith(facts)).toBe(true)
  expect(request.user).toContain('What should I do next?')
  expect(request.user).toContain('The original explanation.')
  expect(request.system).toContain('selected language')
})

it('allows an explanation without a question and discards an old follow-up when a new result arrives', () => {
  const view = render(<ReadingPanel {...props} />)
  fireEvent.click(screen.getByTestId('reading-explain'))
  expect(vi.mocked(generateReading).mock.calls.at(-1)![0].forceCloud).toBe(true)
  view.rerender(<ReadingPanel {...props} readingKey="iching-43-en" user='{"seed":43}' />)
  const request = vi.mocked(generateReading).mock.calls.at(-1)![0]
  expect(request.forceCloud).toBe(false)
  expect(request.user).toBe('{"seed":43}')
})

it('prevents concurrent explanation requests and cancels a request when leaving', () => {
  vi.mocked(generateReading).mockImplementation((_request, emit) => emit({ source: 'model', text: '', done: false }))
  const view = render(<ReadingPanel {...props} />)
  fireEvent.click(screen.getByTestId('reading-explain'))
  expect(generateReading).toHaveBeenCalledTimes(1)
  const request = vi.mocked(generateReading).mock.calls[0][0]
  view.unmount()
  expect(request.signal.aborted).toBe(true)
})

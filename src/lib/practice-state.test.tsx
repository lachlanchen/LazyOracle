// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TarotScreen } from '../components/TarotScreen'
import { ReadingPanel } from '../components/ReadingPanel'
import { uiCopy } from '../i18n'
import { generateReading } from './readings'

vi.mock('./readings', () => ({ generateReading: vi.fn() }))
beforeEach(() => {
  localStorage.clear()
  Element.prototype.scrollIntoView = vi.fn()
  vi.mocked(generateReading).mockReset()
  vi.mocked(generateReading).mockImplementation((_request, emit) => emit({ source: 'model', text: 'A retained interpretation.', done: true }))
})
afterEach(cleanup)

it('restores the exact tarot draw and draft after leaving and reopening', () => {
  const props = { copy: uiCopy('en'), language: 'en' as const }
  const view = render(<TarotScreen {...props} />)
  fireEvent.change(screen.getByTestId('tarot-question'), { target: { value: 'A saved question' } })
  fireEvent.click(screen.getByTestId('tarot-draw'))
  const snapshot = localStorage.getItem('lazyoracle.practice.tarot.draw')!
  expect(JSON.parse(snapshot).question).toBe('A saved question')
  view.unmount()
  render(<TarotScreen {...props} />)
  expect(localStorage.getItem('lazyoracle.practice.tarot.draw')).toBe(snapshot)
  expect(screen.getByTestId('tarot-question')).toHaveValue('A saved question')
})

it('restores replies and an unsent follow-up without requesting another reading', () => {
  const props = { copy: uiCopy('en'), readingKey: 'cast-restore', system: 'English', user: '{"seed":7}', offline: 'fallback', header: 'Reading' }
  const view = render(<ReadingPanel {...props} />)
  fireEvent.change(screen.getByTestId('reading-followup'), { target: { value: 'My saved follow-up' } })
  expect(generateReading).toHaveBeenCalledTimes(1)
  view.unmount()
  render(<ReadingPanel {...props} />)
  expect(generateReading).toHaveBeenCalledTimes(1)
  expect(screen.getByText('A retained interpretation.')).toBeTruthy()
  expect(screen.getByTestId('reading-followup')).toHaveValue('My saved follow-up')
  expect(screen.getByTestId('reading-dock').parentElement).toBe(document.body)
})

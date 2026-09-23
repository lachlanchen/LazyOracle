// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { uiCopy } from '../i18n'
import { saveConversation } from '../lib/chat-store'
import { generateChat } from '../lib/readings'
import { ChatScreen } from './ChatScreen'

vi.mock('../lib/readings', () => ({
  chatAvailable: () => true,
  fitToBudget: (turns: unknown[]) => ({ keep: turns, older: [] }),
  historyBudget: () => 24000,
  summariseTurns: vi.fn(),
  generateChat: vi.fn(),
}))

beforeEach(() => {
  // jsdom does not lay out content; model a scrollable phone-sized log.
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(2000)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400)
  saveConversation({ id: 'old', title: 'Older chat', updatedAt: 1, turns: [{ role: 'assistant', content: 'Earlier answer' }] })
  saveConversation({ id: 'new', title: 'Recent chat', updatedAt: 2, turns: [{ role: 'assistant', content: 'Latest answer' }] })
})
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks() })

it('opens the latest conversation at the bottom and returns there on conversation selection', () => {
  render(<ChatScreen copy={uiCopy('en')} language="en" />)
  const log = screen.getByTestId('chat-log')
  expect(log.scrollTop).toBe(2000)
  log.scrollTop = 100
  fireEvent.scroll(log)
  expect(screen.getByTestId('chat-latest')).toBeTruthy()
  fireEvent.click(screen.getByTestId('chat-history'))
  fireEvent.click(screen.getByText('Older chat'))
  expect(log.scrollTop).toBe(2000)
  expect(screen.queryByTestId('chat-latest')).toBeNull()
})

it('preserves a reader’s position during streaming and lets them return to the latest reply', async () => {
  let emit: (value: { text: string }) => void = () => undefined
  let finish: () => void = () => undefined
  vi.mocked(generateChat).mockImplementation(async (_messages, onUpdate) => {
    emit = (value) => onUpdate({ ...value, source: 'model', done: false })
    await new Promise<void>((resolve) => { finish = resolve })
  })
  render(<ChatScreen copy={uiCopy('en')} language="en" />)
  fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Tell me more' } })
  fireEvent.click(screen.getByTestId('chat-send'))
  const log = screen.getByTestId('chat-log')
  log.scrollTop = 200
  fireEvent.scroll(log)
  act(() => emit({ text: 'A new streamed answer' }))
  expect(log.scrollTop).toBe(200)
  fireEvent.click(screen.getByTestId('chat-latest'))
  expect(log.scrollTop).toBe(2000)
  act(() => emit({ text: 'The rest of the answer' }))
  expect(log.scrollTop).toBe(2000)
  await act(async () => finish())
})

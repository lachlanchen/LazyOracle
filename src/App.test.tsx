// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('LazyOracle shell', () => {
  it('opens Tarot from the home grid, draws a three-card spread, and reads it offline', async () => {
    render(<App />)
    expect(screen.getByTestId('practice-tarot').hasAttribute('disabled')).toBe(false)
    expect(screen.getByTestId('practice-bazi').hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByTestId('practice-tarot'))

    fireEvent.change(screen.getByTestId('tarot-question'), { target: { value: 'Should I move this year?' } })
    fireEvent.click(screen.getByTestId('tarot-draw'))
    const stage = screen.getByTestId('spread-stage')
    expect(stage.querySelectorAll('.tarot-card')).toHaveLength(3)
    expect(screen.queryByTestId('reading')).toBeNull()

    fireEvent.click(screen.getByTestId('card-0').querySelector('button')!)
    expect(screen.getByTestId('card-0').className).toContain('revealed')
    fireEvent.click(screen.getByTestId('reveal-all'))
    await waitFor(() => expect(screen.getByTestId('reading')).toBeTruthy())
    const facts = screen.getByTestId('card-facts')
    expect(facts.querySelectorAll('li')).toHaveLength(3)
    // The offline reading names every drawn card.
    const reading = screen.getByTestId('reading').textContent ?? ''
    for (const name of [...facts.querySelectorAll('.fact-card')].map((node) => node.firstChild?.textContent ?? '')) {
      expect(reading).toContain(name)
    }
  })

  it('switches the interface language and keeps it', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('open-settings'))
    fireEvent.click(screen.getByText('简体中文'))
    expect(screen.getByText('设置')).toBeTruthy()
    expect(localStorage.getItem('lazyoracle.language')).toBe('zh-Hans')
    fireEvent.click(screen.getByTestId('back'))
    expect(screen.getByText('塔罗')).toBeTruthy()
  })

  it('lays the Celtic cross out with ten cards and a crossed second card', () => {
    render(<App />)
    fireEvent.click(screen.getByTestId('practice-tarot'))
    fireEvent.click(screen.getByTestId('spread-celtic'))
    fireEvent.click(screen.getByTestId('tarot-draw'))
    expect(screen.getByTestId('spread-stage').querySelectorAll('.tarot-card')).toHaveLength(10)
    expect(screen.getByTestId('card-1').className).toContain('crossed')
  })
})

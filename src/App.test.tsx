// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./lib/hand-detect', () => ({
  detectHand: vi.fn(async () => {
    const points = Array.from({ length: 21 }, (_, i) => ({ x: 0.3 + (i % 5) * 0.08, y: 0.9 - Math.floor(i / 5) * 0.15 }))
    points[0] = { x: 0.5, y: 1 }
    points[9] = { x: 0.5, y: 0.6 }
    points[12] = { x: 0.5, y: 0.26 }
    points[5] = { x: 0.32, y: 0.6 }
    points[8] = { x: 0.32, y: 0.3 }
    points[13] = { x: 0.56, y: 0.6 }
    points[16] = { x: 0.56, y: 0.29 }
    points[17] = { x: 0.68, y: 0.6 }
    points[4] = { x: 0.14, y: 0.8 }
    return points
  }),
}))

// These tests are about the deterministic reading the app composes without a
// model — the one that still answers when the network is gone. The cloud
// reader is on by default in the app itself, so it is switched off here rather
// than letting the tests reach for a service that is not there.
beforeEach(() => {
  localStorage.setItem('lazyoracle.model', JSON.stringify({ endpointEnabled: false }))
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function openPractice(id: string) {
  render(<App />)
  fireEvent.click(screen.getByTestId(`practice-${id}`))
}

function saveDefaultProfile() {
  fireEvent.change(screen.getByTestId('profile-year'), { target: { value: '1990' } })
  fireEvent.change(screen.getByTestId('profile-month'), { target: { value: '6' } })
  fireEvent.change(screen.getByTestId('profile-day'), { target: { value: '15' } })
  fireEvent.click(screen.getByTestId('profile-male'))
  fireEvent.click(screen.getByTestId('profile-save'))
}

describe('LazyOracle shell', () => {
  it('opens Tarot from the home grid, draws a three-card spread, and reads it offline', async () => {
    openPractice('tarot')
    fireEvent.change(screen.getByTestId('tarot-question'), { target: { value: 'Should I move this year?' } })
    fireEvent.click(screen.getByTestId('tarot-draw'))
    expect(screen.getByTestId('spread-stage').querySelectorAll('.tarot-card')).toHaveLength(3)
    expect(screen.queryByTestId('reading')).toBeNull()
    fireEvent.click(screen.getByTestId('card-0').querySelector('button')!)
    expect(screen.getByTestId('card-0').className).toContain('revealed')
    fireEvent.click(screen.getByTestId('reveal-all'))
    await waitFor(() => expect(screen.getByTestId('reading').textContent).toContain('reading'))
    const facts = screen.getByTestId('card-facts')
    expect(facts.querySelectorAll('li')).toHaveLength(3)
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

  it('casts an I Ching hexagram, draws its six lines, and reads the judgement', async () => {
    openPractice('iching')
    fireEvent.change(screen.getByTestId('iching-question'), { target: { value: 'Is this the right time?' } })
    fireEvent.click(screen.getByTestId('method-yarrow'))
    fireEvent.click(screen.getByTestId('iching-cast'))
    await waitFor(() => expect(screen.getByTestId('primary-name')).toBeTruthy(), { timeout: 4000 })
    expect(screen.getByTestId('iching-facts').textContent).toContain('Judgement')
    await waitFor(() => expect(screen.getByTestId('reading').textContent).toContain('Hexagram'))
  })

  it('computes the four pillars from the birth profile and remembers the profile', async () => {
    openPractice('bazi')
    saveDefaultProfile()
    const chart = screen.getByTestId('bazi-chart')
    expect(chart.textContent).toContain('庚')
    expect(chart.textContent).toContain('辛')
    expect(chart.querySelectorAll('.pillar')).toHaveLength(4)
    fireEvent.click(screen.getByTestId('bazi-read'))
    await waitFor(() => expect(screen.getByTestId('reading').textContent).toContain('Four pillars'))
    expect(JSON.parse(localStorage.getItem('lazyoracle.profile')!).year).toBe(1990)
    // Astrology reuses the saved profile without asking again.
    fireEvent.click(screen.getByTestId('back'))
    fireEvent.click(screen.getByTestId('practice-astrology'))
    expect(screen.getByTestId('natal-chart').querySelectorAll('.placements li')).toHaveLength(10)
    fireEvent.click(screen.getByTestId('astro-read'))
    await waitFor(() => expect(screen.getByTestId('reading').textContent).toContain('Ascendant'))
  })

  it('shows the eight mansions rose and a reading', async () => {
    openPractice('fengshui')
    saveDefaultProfile()
    const chart = screen.getByTestId('fengshui-chart')
    expect(chart.querySelectorAll('.sector')).toHaveLength(8)
    expect(chart.textContent).toContain('坎')
    fireEvent.click(screen.getByTestId('fengshui-read'))
    await waitFor(() => expect(screen.getByTestId('reading').textContent).toContain('Favourable directions'))
  })

  it('opens the Book of Answers on a page and shows it as the reading', async () => {
    openPractice('answers')
    fireEvent.change(screen.getByTestId('answers-question'), { target: { value: 'Will it work?' } })
    fireEvent.click(screen.getByTestId('answers-open'))
    const page = screen.getByTestId('book-page')
    expect(page.textContent).toContain('Page')
    await waitFor(() => expect(screen.getByTestId('reading')).toBeTruthy())
    const pageText = page.querySelector('.page-text')?.textContent ?? ''
    await waitFor(() => expect(screen.getByTestId('reading').textContent).toContain(pageText))
  })

  it('reads a hand from detected landmarks and the described lines', async () => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:hand', revokeObjectURL: () => undefined })
    Object.defineProperty(HTMLImageElement.prototype, 'decode', { value: () => Promise.resolve(), configurable: true })
    openPractice('palm')
    const file = new File([new Uint8Array([1, 2, 3])], 'palm.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByTestId('palm-input'), { target: { files: [file] } })
    await waitFor(() => expect(screen.getByTestId('palm-lines')).toBeTruthy())
    fireEvent.click(screen.getByTestId('palm-read'))
    await waitFor(() => expect(screen.getByTestId('reading').textContent).toMatch(/hand/))
    vi.unstubAllGlobals()
  })
})

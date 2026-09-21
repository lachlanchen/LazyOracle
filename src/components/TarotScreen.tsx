import { useCallback, useEffect, useRef, useState } from 'react'
import { Copy, RefreshCw, Sparkles, Wand2 } from 'lucide-react'
import { drawSpread } from '../engines/tarot/draw'
import { SPREAD_ORDER, SPREADS } from '../engines/tarot/spreads'
import type { Spread, TarotDraw } from '../engines/tarot/types'
import type { UICopy } from '../i18n'
import { chatWithEndpoint, loadModelSettings, ModelUnavailable } from '../lib/llm'
import { offlineReading, systemPrompt, tarotContext, userPrompt } from '../lib/reading'
import type { ReadingLanguage } from '../types'
import { TarotCard } from './TarotCard'

interface TarotScreenProps {
  copy: UICopy
  language: ReadingLanguage
}

type ReadingState = { source: 'none' } | { source: 'offline'; text: string } | { source: 'model'; text: string; done: boolean }

/** Renders the little markdown a model tends to emit: **bold** and line breaks. Nothing else. */
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : <span key={index}>{part.replace(/^#+\s*/, '')}</span>,
  )
}

export function TarotScreen({ copy, language }: TarotScreenProps) {
  const [question, setQuestion] = useState('')
  const [spreadId, setSpreadId] = useState<Spread['id']>('three')
  const [draw, setDraw] = useState<TarotDraw | null>(null)
  const [revealed, setRevealed] = useState<boolean[]>([])
  const [reading, setReading] = useState<ReadingState>({ source: 'none' })
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const textLanguage = language === 'en' ? 'en' : 'zh'

  useEffect(() => () => abortRef.current?.abort(), [])

  const startDraw = () => {
    abortRef.current?.abort()
    const next = drawSpread(spreadId, { question })
    setDraw(next)
    setRevealed(next.cards.map(() => false))
    setReading({ source: 'none' })
    setCopied(false)
  }

  const allRevealed = draw ? revealed.every(Boolean) : false

  // Called once, when the last card turns: the reading is produced from the
  // structured draw, by the endpoint when enabled, otherwise from card meanings.
  const startReading = useCallback((current: TarotDraw) => {
    const context = tarotContext(current, language)
    const settings = loadModelSettings()
    const fallback = offlineReading(context)
    if (!settings.endpointEnabled) {
      setReading({ source: 'offline', text: fallback })
      return
    }
    const controller = new AbortController()
    abortRef.current = controller
    let streamed = ''
    setReading({ source: 'model', text: '', done: false })
    chatWithEndpoint(settings, {
      system: systemPrompt(language),
      user: userPrompt(context),
      signal: controller.signal,
      onToken: (token) => {
        streamed += token
        setReading({ source: 'model', text: streamed, done: false })
      },
    })
      .then((text) => {
        if (controller.signal.aborted) return
        setReading(text.trim() ? { source: 'model', text, done: true } : { source: 'offline', text: fallback })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (!(error instanceof ModelUnavailable)) console.warn('model reading failed', error)
        setReading({ source: 'offline', text: fallback })
      })
  }, [language])

  const applyReveal = (next: boolean[]) => {
    setRevealed(next)
    if (draw && next.every(Boolean) && reading.source === 'none') startReading(draw)
  }

  const reveal = (index: number) => applyReveal(revealed.map((value, i) => (i === index ? true : value)))
  const revealAll = () => applyReveal(revealed.map(() => true))

  const copyReading = async () => {
    if (reading.source === 'none' || !draw) return
    const header = draw.cards
      .map((item) => `${item.position.name[textLanguage]}: ${item.card.text[textLanguage].name} (${item.orientation === 'reversed' ? copy.tarot.reversed : copy.tarot.upright})`)
      .join('\n')
    try {
      await navigator.clipboard.writeText(`${copy.appName} · ${draw.spread.name[textLanguage]}\n${draw.question}\n\n${header}\n\n${reading.text}`)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const spread = SPREADS[spreadId]

  return (
    <main className="screen tarot-screen">
      <header className="screen-heading">
        <span className="eyebrow"><Sparkles size={14} /> {copy.tarot.eyebrow}</span>
        <h1>{copy.tarot.title}</h1>
      </header>

      <section className="panel ask-panel">
        <label className="field">
          <span>{copy.tarot.questionLabel}</span>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={copy.tarot.questionPlaceholder}
            rows={2}
            data-testid="tarot-question"
          />
        </label>
        <div className="field">
          <span>{copy.tarot.spreadLabel}</span>
          <div className="chip-row" role="group" aria-label={copy.tarot.spreadLabel}>
            {SPREAD_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                className={id === spreadId ? 'chip active' : 'chip'}
                aria-pressed={id === spreadId}
                data-testid={`spread-${id}`}
                onClick={() => setSpreadId(id)}
              >
                {SPREADS[id].name[textLanguage]}
                <small>{SPREADS[id].positions.length}</small>
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="primary-button" data-testid="tarot-draw" onClick={startDraw}>
          {draw ? <RefreshCw size={18} /> : <Wand2 size={18} />}
          {draw ? copy.tarot.drawAgain : copy.tarot.draw}
        </button>
      </section>

      {draw && (
        <section className="panel spread-panel" aria-label={spread.name[textLanguage]}>
          <div className={`spread-stage ${spread.id}`} data-testid="spread-stage">
            {draw.cards.map((item, index) => (
              <div
                key={item.position.id}
                className="spread-slot"
                style={{ left: `${item.position.layout.x * 100}%`, top: `${item.position.layout.y * 100}%`, zIndex: item.position.layout.rotate ? 2 : 1 }}
              >
                <TarotCard
                  card={item.card}
                  orientation={item.orientation}
                  revealed={revealed[index]}
                  language={textLanguage}
                  label={spread.id === 'celtic' ? `${index + 1}` : item.position.name[textLanguage]}
                  crossed={item.position.layout.rotate}
                  size={spread.id === 'celtic' ? 'small' : 'large'}
                  onReveal={() => reveal(index)}
                  testId={`card-${index}`}
                />
              </div>
            ))}
          </div>
          <div className="spread-actions">
            <p className="hint">{allRevealed ? '' : copy.tarot.tapToReveal}</p>
            {!allRevealed && (
              <button type="button" className="ghost-button" data-testid="reveal-all" onClick={revealAll}>
                {copy.tarot.revealAll}
              </button>
            )}
          </div>
          {allRevealed && (
            <ol className="card-facts" data-testid="card-facts">
              {draw.cards.map((item) => (
                <li key={item.position.id} className={item.orientation}>
                  <span className="fact-position">{item.position.name[textLanguage]}</span>
                  <span className="fact-card">
                    {item.card.text[textLanguage].name}
                    <small>{item.orientation === 'reversed' ? copy.tarot.reversed : copy.tarot.upright}</small>
                  </span>
                  <span className="fact-keywords">{item.card.text[textLanguage][item.orientation].join(textLanguage === 'en' ? ' · ' : '・')}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {draw && allRevealed && (
        <section className="panel reading-panel" aria-live="polite" data-testid="reading">
          <header>
            <h2>{copy.tarot.reading}</h2>
            <span className="seed">{copy.tarot.seed} #{draw.seed.toString(16)}</span>
          </header>
          {reading.source === 'none' || (reading.source === 'model' && !reading.text) ? (
            <p className="thinking">{copy.tarot.thinking}</p>
          ) : (
            <div className="reading-text">
              {reading.text.split(/\n{2,}/).map((paragraph, index) => (
                <p key={index}>{renderInline(paragraph)}</p>
              ))}
            </div>
          )}
          {reading.source === 'offline' && <p className="offline-note">{copy.tarot.offlineNote}</p>}
          {(reading.source === 'offline' || (reading.source === 'model' && reading.done)) && (
            <button type="button" className="ghost-button" onClick={copyReading}>
              <Copy size={16} /> {copied ? copy.tarot.copied : copy.tarot.share}
            </button>
          )}
        </section>
      )}
    </main>
  )
}

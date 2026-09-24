import { usePracticeState } from '../lib/practice-state'
import { RefreshCw, Sparkles, Wand2 } from 'lucide-react'
import { drawSpread } from '../engines/tarot/draw'
import { SPREAD_ORDER, SPREADS } from '../engines/tarot/spreads'
import type { Spread, TarotDraw } from '../engines/tarot/types'
import type { UICopy } from '../i18n'
import { offlineReading, systemPrompt, tarotContext, userPrompt } from '../lib/reading'
import type { ReadingLanguage } from '../types'
import { ReadingPanel } from './ReadingPanel'
import { TarotCard } from './TarotCard'

interface TarotScreenProps {
  copy: UICopy
  language: ReadingLanguage
}

export function TarotScreen({ copy, language }: TarotScreenProps) {
  const [question, setQuestion] = usePracticeState('tarot.question', '')
  const [spreadId, setSpreadId] = usePracticeState<Spread['id']>('tarot.spreadId', 'three')
  const [draw, setDraw] = usePracticeState<TarotDraw | null>('tarot.draw', null)
  const [revealed, setRevealed] = usePracticeState<boolean[]>('tarot.revealed', [])
  const textLanguage = language === 'en' ? 'en' : 'zh'

  const startDraw = () => {
    const next = drawSpread(spreadId, { question })
    setDraw(next)
    setRevealed(next.cards.map(() => false))
  }

  const allRevealed = draw ? revealed.every(Boolean) : false
  const reveal = (index: number) => setRevealed((current) => current.map((value, i) => (i === index ? true : value)))
  const revealAll = () => setRevealed((current) => current.map(() => true))
  const spread = SPREADS[spreadId]
  const context = draw ? tarotContext(draw, language) : null

  return (
    <main className="screen tarot-screen">
      <header className="screen-heading">
        <span className="eyebrow"><Sparkles size={14} /> {copy.tarot.eyebrow}</span>
        <h1>{copy.tarot.title}</h1>
      </header>

      <section className="panel ask-panel">
        <label className="field">
          <span>{copy.common.question}</span>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={copy.common.questionPlaceholder} rows={2} data-testid="tarot-question" />
        </label>
        <div className="field">
          <span>{copy.tarot.spreadLabel}</span>
          <div className="chip-row" role="group" aria-label={copy.tarot.spreadLabel}>
            {SPREAD_ORDER.map((id) => (
              <button key={id} type="button" className={id === spreadId ? 'chip active' : 'chip'} aria-pressed={id === spreadId} data-testid={`spread-${id}`} onClick={() => setSpreadId(id)}>
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
              <div key={item.position.id} className="spread-slot" style={{ left: `${item.position.layout.x * 100}%`, top: `${item.position.layout.y * 100}%`, zIndex: item.position.layout.rotate ? 2 : 1 }}>
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

      {draw && context && allRevealed && (
        <ReadingPanel
          copy={copy}
          readingKey={`tarot-${draw.seed}-${language}`}
          system={systemPrompt(language)}
          user={userPrompt(context)}
          offline={offlineReading(context)}
          header={`${copy.appName} · ${draw.spread.name[textLanguage]}\n${draw.question}\n\n${draw.cards.map((item) => `${item.position.name[textLanguage]}: ${item.card.text[textLanguage].name} (${item.orientation === 'reversed' ? copy.tarot.reversed : copy.tarot.upright})`).join('\n')}`}
          tag={`${copy.tarot.seed} #${draw.seed.toString(16)}`}
        />
      )}
    </main>
  )
}

import { usePracticeState } from '../lib/practice-state'
import { useEffect } from 'react'
import { Moon, RefreshCw } from 'lucide-react'
import { castHexagram, type Hexagram, type IChingCast } from '../engines/iching/cast'
import type { UICopy } from '../i18n'
import { ichingContext, ichingOffline, ichingSystemPrompt } from '../lib/contexts'
import type { ReadingLanguage } from '../types'
import { ReadingPanel } from './ReadingPanel'

interface IChingScreenProps {
  copy: UICopy
  language: ReadingLanguage
}

export function HexagramFigure({ hexagram, changing = [], drawn = 6, size = 'large', label }: { hexagram: Hexagram; changing?: number[]; drawn?: number; size?: 'large' | 'small'; label?: string }) {
  return (
    <figure className={`hexagram ${size}`} aria-label={`${hexagram.name.zh} ${hexagram.name.en}`}>
      <div className="hexagram-lines">
        {[5, 4, 3, 2, 1, 0].map((index) => {
          const yang = hexagram.lines[index] === 1
          const isChanging = changing.includes(index + 1)
          const visible = index < drawn
          return (
            <div key={index} className={`hex-line ${yang ? 'yang' : 'yin'} ${isChanging ? 'changing' : ''} ${visible ? 'visible' : ''}`}>
              {yang ? <span /> : (
                <>
                  <span />
                  <span />
                </>
              )}
              {isChanging && <i className="change-mark" aria-hidden="true">{yang ? '○' : '×'}</i>}
            </div>
          )
        })}
      </div>
      {label && <figcaption>{label}</figcaption>}
    </figure>
  )
}

export function IChingScreen({ copy, language }: IChingScreenProps) {
  const [question, setQuestion] = usePracticeState('iching.question', '')
  const [method, setMethod] = usePracticeState<'coins' | 'yarrow'>('iching.method', 'coins')
  const [cast, setCast] = usePracticeState<IChingCast | null>('iching.cast', null)
  const [drawn, setDrawn] = usePracticeState('iching.drawn', 0)
  const l = language === 'en' ? 'en' : 'zh'

  // Lines appear one by one, bottom to top, so the cast feels like a cast.
  useEffect(() => {
    if (!cast || drawn >= 6) return
    const timer = setTimeout(() => setDrawn((d) => d + 1), 260)
    return () => clearTimeout(timer)
  }, [cast, drawn, setDrawn])

  const doCast = () => {
    setCast(castHexagram({ method, question }))
    setDrawn(0)
  }

  const context = cast ? ichingContext(cast, language) : null
  const complete = cast !== null && drawn >= 6
  const t = copy.iching

  return (
    <main className="screen iching-screen">
      <header className="screen-heading">
        <span className="eyebrow"><Moon size={14} /> {t.eyebrow}</span>
        <h1>{t.title}</h1>
      </header>

      <section className="panel ask-panel">
        <label className="field">
          <span>{copy.common.question}</span>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={copy.common.questionPlaceholder} rows={2} data-testid="iching-question" />
        </label>
        <div className="field">
          <span>{t.method}</span>
          <div className="chip-row" role="group" aria-label={t.method}>
            {(['coins', 'yarrow'] as const).map((m) => (
              <button key={m} type="button" className={m === method ? 'chip active' : 'chip'} aria-pressed={m === method} onClick={() => setMethod(m)} data-testid={`method-${m}`}>
                {t[m]}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="primary-button" onClick={doCast} data-testid="iching-cast">
          <RefreshCw size={18} /> {cast ? t.castAgain : t.cast}
        </button>
      </section>

      {cast && (
        <section className="panel hexagram-panel">
          <div className="hexagram-pair">
            <div className="hexagram-block">
              <HexagramFigure hexagram={cast.primary} changing={cast.changingPositions} drawn={drawn} label={t.primary} />
              {complete && (
                <div className="hexagram-name" data-testid="primary-name">
                  <b>{cast.primary.number} · {cast.primary.name.zh}</b>
                  <span>{l === 'en' ? `${cast.primary.name.pinyin} · ${cast.primary.name.en}` : cast.primary.name.en}</span>
                </div>
              )}
            </div>
            {complete && cast.resulting && (
              <>
                <span className="hexagram-arrow" aria-hidden="true">→</span>
                <div className="hexagram-block">
                  <HexagramFigure hexagram={cast.resulting} label={t.resulting} />
                  <div className="hexagram-name">
                    <b>{cast.resulting.number} · {cast.resulting.name.zh}</b>
                    <span>{l === 'en' ? `${cast.resulting.name.pinyin} · ${cast.resulting.name.en}` : cast.resulting.name.en}</span>
                  </div>
                </div>
              </>
            )}
          </div>
          {complete && (
            <dl className="facts" data-testid="iching-facts">
              <dt>{t.judgement}</dt>
              <dd className="classical">{cast.primary.judgement}</dd>
              <dd>{cast.primary.sense[l]}</dd>
              <dt>{t.changing}</dt>
              <dd>{cast.changingPositions.length ? cast.changingPositions.map((p) => `${t.line} ${p}`).join(' · ') : t.noChange}</dd>
              {cast.resulting && (
                <>
                  <dt>{t.resulting}</dt>
                  <dd>{cast.resulting.sense[l]}</dd>
                </>
              )}
              <dt>{t.rule}</dt>
              <dd>{cast.focus.rule[l]}</dd>
              <dt>{t.related}</dt>
              <dd>
                {[cast.nuclear, cast.opposite, cast.inverse]
                  .map((hexagram) => `${hexagram.number} ${hexagram.name.zh}`)
                  .join(' · ')}
              </dd>
            </dl>
          )}
        </section>
      )}

      {cast && context && complete && (
        <ReadingPanel
          copy={copy}
          readingKey={`iching-${cast.seed}-${language}`}
          system={ichingSystemPrompt(language)}
          user={`Question: ${cast.question || '(none)'}\n\n${JSON.stringify(context, null, 1)}`}
          offline={ichingOffline(context)}
          header={`${copy.appName} · ${t.eyebrow}\n${cast.question}\n\n${cast.primary.number} ${cast.primary.name.zh}${cast.resulting ? ` → ${cast.resulting.number} ${cast.resulting.name.zh}` : ''}`}
          tag={`#${cast.seed.toString(16)}`}
        />
      )}
    </main>
  )
}

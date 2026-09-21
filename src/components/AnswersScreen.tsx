import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { openBook, type Opening } from '../engines/answers/answers'
import type { UICopy } from '../i18n'
import { bookContext, bookOffline, bookSystemPrompt } from '../lib/contexts'
import type { ReadingLanguage } from '../types'
import { ReadingPanel } from './ReadingPanel'

interface AnswersScreenProps {
  copy: UICopy
  language: ReadingLanguage
}

export function AnswersScreen({ copy, language }: AnswersScreenProps) {
  const [question, setQuestion] = useState('')
  const [book, setBook] = useState<'answers' | 'questions'>('answers')
  const [opening, setOpening] = useState<Opening | null>(null)
  const [opened, setOpened] = useState(false)
  const t = copy.answers
  const l = language === 'en' ? 'en' : 'zh'

  const open = () => {
    setOpened(false)
    const next = openBook(book, { question })
    setOpening(next)
    setTimeout(() => setOpened(true), 60)
  }

  const context = opening ? bookContext(opening, language) : null

  return (
    <main className="screen answers-screen">
      <header className="screen-heading">
        <span className="eyebrow"><BookOpen size={14} /> {t.eyebrow}</span>
        <h1>{t.title}</h1>
      </header>

      <section className="panel ask-panel">
        <label className="field">
          <span>{copy.common.question}</span>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t.hint} rows={2} data-testid="answers-question" />
        </label>
        <div className="chip-row" role="group">
          {(['answers', 'questions'] as const).map((b) => (
            <button key={b} type="button" className={b === book ? 'chip active' : 'chip'} aria-pressed={b === book} onClick={() => setBook(b)} data-testid={`book-${b}`}>
              {t[b]}
            </button>
          ))}
        </div>
        <button type="button" className="primary-button" onClick={open} data-testid="answers-open">
          <BookOpen size={18} /> {opening ? t.openAgain : t.open}
        </button>
      </section>

      {opening && (
        <section className={`panel book-panel ${opened ? 'opened' : ''}`} data-testid="book-page">
          <div className="book">
            <div className="book-page left" />
            <div className="book-page right">
              <span className="page-number">{l === 'en' ? `${t.page} ${opening.page.number}` : `${t.page}${opening.page.number}页`}</span>
              <p className="page-text">{opening.page[l]}</p>
            </div>
          </div>
        </section>
      )}

      {opening && context && opened && (
        <ReadingPanel
          copy={copy}
          readingKey={`book-${opening.seed}-${language}`}
          system={bookSystemPrompt(language)}
          user={`Question: ${opening.question || '(none)'}\n\n${JSON.stringify(context, null, 1)}`}
          offline={bookOffline(context)}
          header={`${copy.appName} · ${t[book]}\n${opening.question}`}
          title={t[book]}
        />
      )}
    </main>
  )
}

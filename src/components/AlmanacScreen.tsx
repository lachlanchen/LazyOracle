import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { ACTIVITIES, almanacFor, judgeActivity, luckyHours, STANDING_TEXT, VERDICT_TEXT } from '../engines/almanac/almanac'
import type { UICopy } from '../i18n'
import { almanacContext, almanacOffline, almanacSystemPrompt } from '../lib/contexts'
import type { ReadingLanguage } from '../types'
import { ReadingPanel } from './ReadingPanel'

interface AlmanacScreenProps {
  copy: UICopy
  language: ReadingLanguage
}

function isoToday(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function parseIso(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

function shiftDays(value: string, days: number): string {
  const date = parseIso(value)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function AlmanacScreen({ copy, language }: AlmanacScreenProps) {
  const [date, setDate] = useState(isoToday)
  const [activityId, setActivityId] = useState<string>('')
  const [question, setQuestion] = useState('')
  const [round, setRound] = useState(0)
  const t = copy.almanac
  const l = language === 'en' ? 'en' : 'zh'

  const day = almanacFor(parseIso(date))
  const activity = ACTIVITIES.find((item) => item.id === activityId) ?? null
  const judgement = activity ? judgeActivity(day, activity) : null
  const context = almanacContext(day, activity, language, question)

  return (
    <main className="screen almanac-screen">
      <header className="screen-heading">
        <span className="eyebrow">{t.eyebrow}</span>
        <h1>{t.title}</h1>
        <p className="body">{t.hint}</p>
      </header>

      <section className="panel">
        <div className="almanac-date">
          <button type="button" className="ghost-button" onClick={() => setDate((value) => shiftDays(value, -1))} aria-label={t.previousDay}>
            ‹
          </button>
          <label className="field">
            <span className="sr-only">{t.pickDate}</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value || isoToday())} data-testid="almanac-date" />
          </label>
          <button type="button" className="ghost-button" onClick={() => setDate((value) => shiftDays(value, 1))} aria-label={t.nextDay}>
            ›
          </button>
        </div>
        <div className="chip-row">
          <button type="button" className="chip" onClick={() => setDate(isoToday())}>
            {t.today}
          </button>
          <span className="seed">
            {day.lunar.text} · {day.lunar.yearGanZhi}
            {day.lunar.zodiac} · {day.lunar.dayGanZhi}
            {day.solarTerm ? ` · ${day.solarTerm}` : ''}
          </span>
        </div>
      </section>

      <section className="panel" data-testid="almanac-page">
        <dl className="facts">
          <dt>{t.suitable}</dt>
          <dd className="almanac-yi">{day.yi.join(l === 'en' ? ' · ' : '　') || t.nothingListed}</dd>
          <dt>{t.avoid}</dt>
          <dd className="almanac-ji">{day.ji.join(l === 'en' ? ' · ' : '　') || t.nothingListed}</dd>
          <dt>{t.officer}</dt>
          <dd>
            {day.dayOfficer} · {day.spirit.name} {day.spirit.road} · {day.mansion.name}
            {day.mansion.animal}
          </dd>
          <dt>{t.clash}</dt>
          <dd>
            {day.clash} · {t.harm} {day.harmDirection} · {STANDING_TEXT[day.standing][l]}
          </dd>
          <dt>{t.hours}</dt>
          <dd>{luckyHours(day).map((hour) => `${hour.ganzhi} ${hour.range}`).join(l === 'en' ? ' · ' : '　')}</dd>
          <dt>{t.pengzu}</dt>
          <dd>{day.pengzu.join(' ')}</dd>
        </dl>
      </section>

      <section className="panel">
        <h2>{t.canI}</h2>
        <div className="chip-row" role="group" aria-label={t.canI}>
          {ACTIVITIES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === activityId ? 'chip active' : 'chip'}
              aria-pressed={item.id === activityId}
              onClick={() => setActivityId(item.id === activityId ? '' : item.id)}
              data-testid={`activity-${item.id}`}
            >
              {item.name[l]}
            </button>
          ))}
        </div>
        {activity && judgement && (
          <p className={`almanac-verdict ${judgement.verdict}`} data-testid="almanac-verdict">
            <strong>
              {activity.name[l]}：{VERDICT_TEXT[judgement.verdict][l]}
            </strong>{' '}
            {judgement.basis[l]}
          </p>
        )}
        <label className="field">
          <span>{copy.common.question}</span>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={copy.common.questionPlaceholder} rows={2} />
        </label>
        <button type="button" className="primary-button" onClick={() => setRound((value) => value + 1)} data-testid="almanac-read">
          <CalendarDays size={18} /> {t.read}
        </button>
      </section>

      {round > 0 && (
        <ReadingPanel
          copy={copy}
          readingKey={`almanac-${date}-${activityId}-${round}-${language}`}
          system={almanacSystemPrompt(language)}
          user={`Question: ${question || '(none)'}\n\n${JSON.stringify(context, null, 1)}`}
          offline={almanacOffline(context)}
          header={`${copy.appName} · ${t.eyebrow}\n${date} ${day.lunar.text}`}
        />
      )}
    </main>
  )
}

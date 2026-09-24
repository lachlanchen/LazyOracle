import { usePracticeState } from '../lib/practice-state'
import { useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { BODY_TEXT, computeChart, formatDegree, SIGNS, transitsFor, type NatalChart } from '../engines/astrology/astrology'
import type { UICopy } from '../i18n'
import { astrologyContext, astrologyOffline, astrologySystemPrompt } from '../lib/contexts'
import { loadProfile, type BirthProfile } from '../lib/profile'
import type { ReadingLanguage } from '../types'
import { ProfileForm } from './ProfileForm'
import { ReadingPanel } from './ReadingPanel'

interface AstrologyScreenProps {
  copy: UICopy
  language: ReadingLanguage
}

/** The natal wheel: signs on the outer ring, houses counted from the Ascendant on the left, planets on their degrees. */
export function NatalWheel({ chart }: { chart: NatalChart }) {
  const size = 320
  const c = size / 2
  const rOuter = 150
  const rInner = 118
  const rPlanet = 96
  // Rotate so the Ascendant sits at 9 o'clock; the zodiac runs counter-clockwise.
  const angle = (longitude: number) => ((180 - (longitude - chart.ascendant)) * Math.PI) / 180
  const point = (longitude: number, radius: number) => ({ x: c + radius * Math.cos(angle(longitude)), y: c - radius * Math.sin(angle(longitude)) })
  const placed: { x: number; y: number; body: string; symbol: string }[] = []
  for (const p of [...chart.placements].sort((a, b) => a.longitude - b.longitude)) {
    let longitude = p.longitude
    // Nudge glyphs apart when planets sit within 6° of one another.
    for (const other of placed) {
      const o = point(longitude, rPlanet)
      if (Math.hypot(o.x - other.x, o.y - other.y) < 16) longitude += 6
    }
    const pt = point(longitude, rPlanet)
    placed.push({ ...pt, body: p.body, symbol: BODY_TEXT[p.body].symbol })
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="natal-wheel" role="img" aria-label="natal chart">
      <circle cx={c} cy={c} r={rOuter} className="wheel-ring" />
      <circle cx={c} cy={c} r={rInner} className="wheel-ring" />
      <circle cx={c} cy={c} r={rPlanet - 22} className="wheel-ring faint" />
      {SIGNS.map((sign, index) => {
        const start = index * 30
        const a = point(start, rOuter)
        const b = point(start, rInner)
        const mid = point(start + 15, (rOuter + rInner) / 2)
        return (
          <g key={sign.en}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="wheel-tick" />
            <text x={mid.x} y={mid.y} className={`sign-glyph ${sign.element}`} textAnchor="middle" dominantBaseline="central">{sign.symbol}</text>
          </g>
        )
      })}
      {Array.from({ length: 12 }, (_, house) => {
        const start = chart.ascendantSign * 30 + house * 30
        const a = point(start, rInner)
        const b = point(start, rPlanet - 22)
        const mid = point(start + 15, rPlanet - 34)
        return (
          <g key={house}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="wheel-tick faint" />
            <text x={mid.x} y={mid.y} className="house-number" textAnchor="middle" dominantBaseline="central">{house + 1}</text>
          </g>
        )
      })}
      {(() => {
        const a = point(chart.ascendant, rOuter + 6)
        const b = point(chart.ascendant + 180, rOuter + 6)
        const m = point(chart.midheaven, rOuter + 6)
        return (
          <>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="wheel-axis" />
            <text x={Math.max(a.x - 12, 14)} y={a.y} className="axis-label" textAnchor="end" dominantBaseline="central">ASC</text>
            <text x={m.x} y={m.y - 10} className="axis-label" textAnchor="middle">MC</text>
          </>
        )
      })()}
      {placed.map((p) => (
        <text key={p.body} x={p.x} y={p.y} className="planet-glyph" textAnchor="middle" dominantBaseline="central">{p.symbol}</text>
      ))}
    </svg>
  )
}

export function AstrologyScreen({ copy, language }: AstrologyScreenProps) {
  const [profile, setProfile] = useState<BirthProfile | null>(() => loadProfile())
  const [editing, setEditing] = useState(profile === null)
  const [question, setQuestion] = usePracticeState('astrology.question', '')
  const [asked, setAsked] = usePracticeState('astrology.asked', '')
  const [round, setRound] = usePracticeState('astrology.round', 0)
  const en = language === 'en'
  const t = copy.astrology
  const today = useMemo(() => new Date(), [])

  const chart = useMemo(() => (profile && !editing ? computeChart(profile) : null), [profile, editing])
  const transits = useMemo(() => (chart ? transitsFor(chart, today) : null), [chart, today])
  const context = chart && transits && round > 0 ? astrologyContext(chart, transits.transits, language, asked, today) : null
  const signName = (index: number) => (en ? SIGNS[index].en : SIGNS[index].zh)
  const bodyName = (body: keyof typeof BODY_TEXT) => (en ? body : BODY_TEXT[body].zh)

  return (
    <main className="screen astrology-screen">
      <header className="screen-heading">
        <span className="eyebrow"><Star size={14} /> {t.eyebrow}</span>
        <h1>{t.title}</h1>
      </header>

      {editing || !profile ? (
        <ProfileForm copy={copy} language={language} initial={profile} onSaved={(saved) => { setProfile(saved); setEditing(false); setRound(0) }} />
      ) : (
        <>
          {chart && transits && (
            <section className="panel chart-panel" data-testid="natal-chart">
              <NatalWheel chart={chart} />
              {!profile.timeKnown && <p className="hint">{copy.common.approximateHour}</p>}
              <dl className="facts">
                <dt>{t.ascendant}</dt>
                <dd>{signName(Math.floor(chart.ascendant / 30))} {formatDegree(chart.ascendant)}</dd>
                <dt>{t.midheaven}</dt>
                <dd>{signName(Math.floor(chart.midheaven / 30))} {formatDegree(chart.midheaven)}</dd>
              </dl>
              <ol className="placements" aria-label={t.placements}>
                {chart.placements.map((p) => (
                  <li key={p.body}>
                    <span className="glyph">{BODY_TEXT[p.body].symbol}</span>
                    <span className="body">{bodyName(p.body)}</span>
                    <span className="sign">{signName(p.sign)} {formatDegree(p.longitude)}</span>
                    <span className="house">{en ? `${t.house} ${p.house}` : `第${p.house}${t.house}`}{p.retrograde ? ` · ${t.retrograde}` : ''}</span>
                  </li>
                ))}
              </ol>
              <div className="aspect-list">
                <span className="facts-title">{t.aspects}</span>
                <p>{chart.aspects.map((a) => `${BODY_TEXT[a.a].symbol} ${a.type} ${BODY_TEXT[a.b].symbol}`).join(' · ')}</p>
              </div>
              <div className="aspect-list">
                <span className="facts-title">{t.today} · {today.toISOString().slice(0, 10)}</span>
                <p>{transits.transits.length ? transits.transits.map((x) => `${BODY_TEXT[x.transiting].symbol} ${x.type} ${bodyName(x.natal)}`).join(' · ') : t.noTransits}</p>
              </div>
              <button type="button" className="link-button" onClick={() => setEditing(true)}>{copy.common.editProfile}</button>
            </section>
          )}

          <section className="panel ask-panel">
            <label className="field">
              <span>{copy.common.question}</span>
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={copy.common.questionPlaceholder} rows={2} data-testid="astro-question" />
            </label>
            <button type="button" className="primary-button" data-testid="astro-read" onClick={() => { setAsked(question); setRound((r) => r + 1) }}>
              {t.compute}
            </button>
          </section>

          {chart && context && (
            <ReadingPanel
              copy={copy}
              readingKey={`astro-${round}-${language}`}
              system={astrologySystemPrompt(language)}
              user={`Question: ${asked || '(none)'}\n\n${JSON.stringify(context, null, 1)}`}
              offline={astrologyOffline(context)}
              header={`${copy.appName} · ${t.eyebrow}\n${asked}\n\n${chart.placements.slice(0, 3).map((p) => `${p.body} ${SIGNS[p.sign].en}`).join(', ')}`}
            />
          )}
        </>
      )}
    </main>
  )
}

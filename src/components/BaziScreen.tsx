import { useMemo, useState } from 'react'
import { Hexagon } from 'lucide-react'
import { computeBazi, ELEMENT_EN, TEN_GOD_EN, type BaziChart, type Pillar } from '../engines/bazi/bazi'
import type { UICopy } from '../i18n'
import { baziContext, baziOffline, baziSystemPrompt } from '../lib/contexts'
import { loadProfile, type BirthProfile } from '../lib/profile'
import type { ReadingLanguage } from '../types'
import { ProfileForm } from './ProfileForm'
import { ReadingPanel } from './ReadingPanel'

interface BaziScreenProps {
  copy: UICopy
  language: ReadingLanguage
}

const ELEMENT_CLASS: Record<string, string> = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' }

function PillarCard({ pillar, title, isDay, en }: { pillar: Pillar; title: string; isDay: boolean; en: boolean }) {
  return (
    <div className={`pillar ${isDay ? 'day' : ''}`}>
      <span className="pillar-title">{title}</span>
      <span className={`pillar-god`}>{en ? TEN_GOD_EN[pillar.stemGod] ?? pillar.stemGod : pillar.stemGod}</span>
      <span className={`pillar-char stem ${ELEMENT_CLASS[pillar.element]}`}>{pillar.stem}</span>
      <span className={`pillar-char branch ${ELEMENT_CLASS[branchElement(pillar.branch)]}`}>{pillar.branch}</span>
      <span className="pillar-hidden">{pillar.hiddenStems.map((h) => h.stem).join(' ')}</span>
      <span className="pillar-nayin">{pillar.naYin}</span>
    </div>
  )
}

function branchElement(branch: string): string {
  return { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' }[branch] ?? '土'
}

export function BaziScreen({ copy, language }: BaziScreenProps) {
  const [profile, setProfile] = useState<BirthProfile | null>(() => loadProfile())
  const [editing, setEditing] = useState(profile === null)
  const [question, setQuestion] = useState('')
  const [asked, setAsked] = useState<string>('')
  const [round, setRound] = useState(0)
  const en = language === 'en'
  const t = copy.bazi

  const chart: BaziChart | null = useMemo(() => {
    if (!profile || editing) return null
    return computeBazi({ ...profile, longitude: profile.longitude, utcOffsetHours: profile.utcOffsetHours })
  }, [profile, editing])

  const context = chart && profile && round > 0 ? baziContext(chart, language, asked, profile.timeKnown) : null

  return (
    <main className="screen bazi-screen">
      <header className="screen-heading">
        <span className="eyebrow"><Hexagon size={14} /> {t.eyebrow}</span>
        <h1>{t.title}</h1>
      </header>

      {editing || !profile ? (
        <ProfileForm
          copy={copy}
          language={language}
          initial={profile}
          onSaved={(saved) => {
            setProfile(saved)
            setEditing(false)
            setRound(0)
          }}
        />
      ) : (
        <>
          {chart && (
            <section className="panel chart-panel" data-testid="bazi-chart">
              <div className="pillars">
                <PillarCard pillar={chart.pillars.hour} title={t.hour} isDay={false} en={en} />
                <PillarCard pillar={chart.pillars.day} title={t.day} isDay en={en} />
                <PillarCard pillar={chart.pillars.month} title={t.month} isDay={false} en={en} />
                <PillarCard pillar={chart.pillars.year} title={t.year} isDay={false} en={en} />
              </div>
              {!profile.timeKnown && <p className="hint">{copy.common.approximateHour}</p>}
              <div className="element-bars" aria-label={t.elements}>
                {(Object.keys(chart.elements) as (keyof typeof chart.elements)[]).map((element) => (
                  <div key={element} className={`element-bar ${ELEMENT_CLASS[element]}`}>
                    <span className="element-name">{en ? ELEMENT_EN[element] : element}</span>
                    <span className="element-track"><span className="element-fill" style={{ width: `${(chart.elements[element] / 8) * 100}%` }} /></span>
                    <span className="element-count">{chart.elements[element]}</span>
                  </div>
                ))}
              </div>
              <dl className="facts">
                <dt>{t.dayMaster}</dt>
                <dd>
                  {chart.dayMaster.stem} · {en ? `${chart.dayMaster.yinYang === '阳' ? 'yang' : 'yin'} ${ELEMENT_EN[chart.dayMaster.element]}` : `${chart.dayMaster.yinYang}${chart.dayMaster.element}`} · {t.strength[chart.strength]}
                </dd>
                <dt>{t.favourable}</dt>
                <dd>{chart.favourable.map((e) => (en ? ELEMENT_EN[e] : e)).join(en ? ', ' : '、')}</dd>
                <dt>{t.solarTerms}</dt>
                <dd>{chart.lunar.jieQiBefore} → {chart.lunar.jieQiAfter} · {chart.lunar.text}</dd>
                <dt>{t.thisYear}</dt>
                <dd>{chart.currentYear.year} {chart.currentYear.ganzhi} · {en ? TEN_GOD_EN[chart.currentYear.god] : chart.currentYear.god}</dd>
              </dl>
              <div className="luck-cycles" aria-label={t.luck}>
                <span className="facts-title">{t.luck}</span>
                <ol>
                  {chart.luckCycles.map((cycle) => {
                    const now = new Date().getFullYear()
                    const current = now >= cycle.startYear && now <= cycle.endYear
                    return (
                      <li key={cycle.ganzhi + cycle.startYear} className={current ? 'current' : ''}>
                        <b>{cycle.ganzhi}</b>
                        <small>{cycle.startYear}–{cycle.endYear}</small>
                      </li>
                    )
                  })}
                </ol>
              </div>
              <button type="button" className="link-button" onClick={() => setEditing(true)} data-testid="bazi-edit">
                {copy.common.editProfile}
              </button>
            </section>
          )}

          <section className="panel ask-panel">
            <label className="field">
              <span>{copy.common.question}</span>
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={copy.common.questionPlaceholder} rows={2} data-testid="bazi-question" />
            </label>
            <button
              type="button"
              className="primary-button"
              data-testid="bazi-read"
              onClick={() => {
                setAsked(question)
                setRound((r) => r + 1)
              }}
            >
              {t.compute}
            </button>
          </section>

          {chart && context && (
            <ReadingPanel
              copy={copy}
              readingKey={`bazi-${round}-${language}`}
              system={baziSystemPrompt(language)}
              user={`Question: ${asked || '(none)'}\n\n${JSON.stringify(context, null, 1)}`}
              offline={baziOffline(context)}
              header={`${copy.appName} · ${t.eyebrow}\n${asked}\n\n${chart.pillars.year.ganzhi} ${chart.pillars.month.ganzhi} ${chart.pillars.day.ganzhi} ${chart.pillars.hour.ganzhi}`}
            />
          )}
        </>
      )}
    </main>
  )
}

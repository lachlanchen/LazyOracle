import { usePracticeState } from '../lib/practice-state'
import { useEffect, useMemo, useState } from 'react'
import { Compass } from 'lucide-react'
import { DIRECTION_TEXT, DIRECTIONS, eightMansions, GUA_EN, sectorForHeading, type Direction } from '../engines/fengshui/fengshui'
import type { UICopy } from '../i18n'
import { fengshuiContext, fengshuiOffline, fengshuiSystemPrompt } from '../lib/contexts'
import { loadProfile, type BirthProfile } from '../lib/profile'
import type { ReadingLanguage } from '../types'
import { ProfileForm } from './ProfileForm'
import { ReadingPanel } from './ReadingPanel'

interface FengShuiScreenProps {
  copy: UICopy
  language: ReadingLanguage
}

type CompassState = 'idle' | 'needs-permission' | 'active' | 'unavailable'

function useCompass(): { heading: number | null; state: CompassState; enable: () => Promise<void> } {
  const [heading, setHeading] = useState<number | null>(null)
  const [state, setState] = useState<CompassState>(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return 'unavailable'
    const requestPermission = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission
    return typeof requestPermission === 'function' ? 'needs-permission' : 'active'
  })

  useEffect(() => {
    if (state !== 'active') return
    const onOrientation = (event: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      if (typeof event.webkitCompassHeading === 'number') setHeading(event.webkitCompassHeading)
      else if (event.absolute && typeof event.alpha === 'number') setHeading((360 - event.alpha) % 360)
      else if (typeof event.alpha === 'number') setHeading((360 - event.alpha) % 360)
    }
    window.addEventListener('deviceorientationabsolute', onOrientation as EventListener)
    window.addEventListener('deviceorientation', onOrientation as EventListener)
    return () => {
      window.removeEventListener('deviceorientationabsolute', onOrientation as EventListener)
      window.removeEventListener('deviceorientation', onOrientation as EventListener)
    }
  }, [state])

  const enable = async () => {
    const requestPermission = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission
    if (typeof requestPermission === 'function') {
      try {
        const result = await requestPermission()
        setState(result === 'granted' ? 'active' : 'unavailable')
      } catch {
        setState('unavailable')
      }
    } else setState('active')
  }
  return { heading, state, enable }
}

export function BaguaRose({ sectors, heading, en }: { sectors: { direction: Direction; auspicious: boolean; label: string }[]; heading: number | null; en: boolean }) {
  const size = 300
  const c = size / 2
  const rotation = heading === null ? 0 : -heading
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="bagua-rose" role="img" aria-label="bagua compass">
      <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '50% 50%', transition: 'transform .3s ease-out' }}>
        {sectors.map((sector, index) => {
          const start = ((index * 45 - 22.5 - 90) * Math.PI) / 180
          const end = ((index * 45 + 22.5 - 90) * Math.PI) / 180
          const r1 = 70
          const r2 = 138
          const p = (angle: number, r: number) => `${c + r * Math.cos(angle)},${c + r * Math.sin(angle)}`
          const d = `M${p(start, r1)} L${p(start, r2)} A${r2},${r2} 0 0 1 ${p(end, r2)} L${p(end, r1)} A${r1},${r1} 0 0 0 ${p(start, r1)} Z`
          const mid = (start + end) / 2
          const label = { x: c + 104 * Math.cos(mid), y: c + 104 * Math.sin(mid) }
          const dir = { x: c + 148 * Math.cos(mid), y: c + 148 * Math.sin(mid) }
          return (
            <g key={sector.direction} className={sector.auspicious ? 'sector good' : 'sector bad'}>
              <path d={d} />
              <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="central" className="sector-label">{sector.label}</text>
              <text x={dir.x} y={dir.y} textAnchor="middle" dominantBaseline="central" className="sector-dir">{en ? sector.direction : DIRECTION_TEXT[sector.direction].zh}</text>
            </g>
          )
        })}
      </g>
      <polygon points={`${c},${c - 62} ${c - 7},${c - 40} ${c + 7},${c - 40}`} className="rose-needle" />
      <circle cx={c} cy={c} r={4} className="rose-pin" />
    </svg>
  )
}

export function FengShuiScreen({ copy, language }: FengShuiScreenProps) {
  const [profile, setProfile] = useState<BirthProfile | null>(() => loadProfile())
  const [editing, setEditing] = useState(profile === null)
  const [question, setQuestion] = usePracticeState('fengshui.question', '')
  const [asked, setAsked] = usePracticeState('fengshui.asked', '')
  const [round, setRound] = usePracticeState('fengshui.round', 0)
  const { heading, state, enable } = useCompass()
  const en = language === 'en'
  const t = copy.fengshui

  const mansions = useMemo(() => (profile && !editing ? eightMansions(profile.year, profile.month, profile.day, profile.gender) : null), [profile, editing])
  const facing = heading === null ? null : sectorForHeading(heading)
  const context = mansions && round > 0 ? fengshuiContext(mansions, language, asked, facing ? DIRECTION_TEXT[facing][en ? 'en' : 'zh'] : null) : null

  return (
    <main className="screen fengshui-screen">
      <header className="screen-heading">
        <span className="eyebrow"><Compass size={14} /> {t.eyebrow}</span>
        <h1>{t.title}</h1>
      </header>

      {editing || !profile ? (
        <ProfileForm copy={copy} language={language} initial={profile} fields={[]} onSaved={(saved) => { setProfile(saved); setEditing(false); setRound(0) }} />
      ) : (
        <>
          {mansions && (
            <section className="panel chart-panel" data-testid="fengshui-chart">
              <BaguaRose
                sectors={DIRECTIONS.map((direction) => {
                  const sector = mansions.sectors.find((s) => s.direction === direction)!
                  return { direction, auspicious: sector.quality.auspicious, label: sector.quality.name.zh }
                })}
                heading={heading}
                en={en}
              />
              <div className="compass-status">
                {state === 'needs-permission' && (
                  <button type="button" className="ghost-button" onClick={enable}>{t.enableCompass}</button>
                )}
                {state === 'unavailable' && <p className="hint">{t.noCompass}</p>}
                {heading !== null && facing && (
                  <p className="heading-readout" data-testid="heading">
                    {t.heading} {Math.round(heading)}° · {t.facing} {DIRECTION_TEXT[facing][en ? 'en' : 'zh']}
                  </p>
                )}
              </div>
              <dl className="facts">
                <dt>{t.gua}</dt>
                <dd>{mansions.gua} {en ? GUA_EN[mansions.gua] : ''} · {mansions.group === 'east' ? t.east : t.west} · {mansions.year}</dd>
                <dt>{t.good}</dt>
                <dd>{mansions.sectors.filter((s) => s.quality.auspicious).map((s) => `${DIRECTION_TEXT[s.direction][en ? 'en' : 'zh']} ${s.quality.name[en ? 'en' : 'zh']}`).join(' · ')}</dd>
                <dt>{t.bad}</dt>
                <dd>{mansions.sectors.filter((s) => !s.quality.auspicious).map((s) => `${DIRECTION_TEXT[s.direction][en ? 'en' : 'zh']} ${s.quality.name[en ? 'en' : 'zh']}`).join(' · ')}</dd>
              </dl>
              <button type="button" className="link-button" onClick={() => setEditing(true)}>{copy.common.editProfile}</button>
            </section>
          )}

          <section className="panel ask-panel">
            <label className="field">
              <span>{copy.common.question}</span>
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={copy.common.questionPlaceholder} rows={2} data-testid="fengshui-question" />
            </label>
            <button type="button" className="primary-button" data-testid="fengshui-read" onClick={() => { setAsked(question); setRound((r) => r + 1) }}>
              {t.compute}
            </button>
          </section>

          {mansions && context && (
            <ReadingPanel
              copy={copy}
              readingKey={`fengshui-${round}-${language}`}
              system={fengshuiSystemPrompt(language)}
              user={`Question: ${asked || '(none)'}\n\n${JSON.stringify(context, null, 1)}`}
              offline={fengshuiOffline(context)}
              header={`${copy.appName} · ${t.eyebrow}\n${asked}\n\n${mansions.gua} · ${mansions.group}`}
            />
          )}
        </>
      )}
    </main>
  )
}

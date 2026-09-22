import { useRef, useState } from 'react'
import { Camera, Hand, Image as ImageIcon } from 'lucide-react'
import { FINGER_TEXT, palmFeatures, PALACE_TEXT, SHAPE_TEXT, type LineTraits, type PalmFeatures, type Point } from '../engines/palm/palm'
import type { UICopy } from '../i18n'
import { palmContext, palmOffline, palmSystemPrompt } from '../lib/contexts'
import { detectHand } from '../lib/hand-detect'
import type { ReadingLanguage } from '../types'
import { ReadingPanel } from './ReadingPanel'

interface PalmScreenProps {
  copy: UICopy
  language: ReadingLanguage
}

type Phase = 'idle' | 'analysing' | 'found' | 'nohand'

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
]

export function PalmScreen({ copy, language }: PalmScreenProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [landmarks, setLandmarks] = useState<Point[] | null>(null)
  const [lines, setLines] = useState<LineTraits>({ heart: 'between', head: 'curved', life: 'wide', fate: 'unsure' })
  const [features, setFeatures] = useState<PalmFeatures | null>(null)
  const [question, setQuestion] = useState('')
  const [round, setRound] = useState(0)
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const t = copy.palm
  const l = language === 'en' ? 'en' : 'zh'

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setFeatures(null)
    setRound(0)
    setPhase('analysing')
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      const found = await detectHand(image)
      setLandmarks(found)
      setPhase(found ? 'found' : 'nohand')
    } catch (error) {
      console.warn('hand detection failed', error)
      setLandmarks(null)
      setPhase('nohand')
    }
  }

  const read = () => {
    if (!landmarks) return
    setFeatures(palmFeatures(landmarks, lines))
    setRound((r) => r + 1)
  }

  const context = features && round > 0 ? palmContext(features, language, question) : null

  return (
    <main className="screen palm-screen">
      <header className="screen-heading">
        <span className="eyebrow"><Hand size={14} /> {t.eyebrow}</span>
        <h1>{t.title}</h1>
      </header>

      <section className="panel">
        <div className="button-row">
          <button type="button" className="primary-button" onClick={() => cameraRef.current?.click()} data-testid="palm-camera">
            <Camera size={18} /> {t.takePhoto}
          </button>
          <button type="button" className="ghost-button" onClick={() => fileRef.current?.click()} data-testid="palm-file">
            <ImageIcon size={16} /> {t.choosePhoto}
          </button>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onFile(e.target.files?.[0])} data-testid="palm-input" />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
        <p className="hint">{t.hint}</p>
        {imageUrl && (
          <div className="palm-preview">
            <img src={imageUrl} alt="" />
            {landmarks && (
              <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="palm-overlay" aria-hidden="true">
                {CONNECTIONS.map(([a, b]) => (
                  <line key={`${a}-${b}`} x1={landmarks[a].x} y1={landmarks[a].y} x2={landmarks[b].x} y2={landmarks[b].y} />
                ))}
                {landmarks.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="0.008" />
                ))}
              </svg>
            )}
            {phase === 'analysing' && <p className="palm-status">{t.analysing}</p>}
          </div>
        )}
        {phase === 'nohand' && <p className="status failed">{t.noHand}</p>}
      </section>

      {phase === 'found' && landmarks && (
        <section className="panel lines-panel" data-testid="palm-lines">
          {(
            [
              ['heart', ['index', 'middle', 'between'], ['heartIndex', 'heartMiddle', 'heartBetween']],
              ['head', ['straight', 'curved'], ['headStraight', 'headCurved']],
              ['life', ['wide', 'close'], ['lifeWide', 'lifeClose']],
              ['fate', ['present', 'absent', 'unsure'], ['fatePresent', 'fateAbsent', 'fateUnsure']],
            ] as const
          ).map(([key, values, labels]) => (
            <div className="field" key={key}>
              <span>{t[key]}</span>
              <div className="chip-row" role="group" aria-label={t[key]}>
                {values.map((value, index) => (
                  <button
                    key={value}
                    type="button"
                    className={lines[key] === value ? 'chip active' : 'chip'}
                    aria-pressed={lines[key] === value}
                    onClick={() => setLines((current) => ({ ...current, [key]: value }))}
                  >
                    {t[labels[index]]}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <label className="field">
            <span>{copy.common.question}</span>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={copy.common.questionPlaceholder} rows={2} />
          </label>
          <button type="button" className="primary-button" onClick={read} data-testid="palm-read">
            {t.read}
          </button>
        </section>
      )}

      {features && (
        <section className="panel">
          <dl className="facts">
            <dt>{t.shape}</dt>
            <dd>{SHAPE_TEXT[features.shape][l]} · {SHAPE_TEXT[features.shape].keywords[l].join(l === 'en' ? ', ' : '、')}</dd>
            <dt>{t.handLabel}</dt>
            <dd>
              {l === 'en' ? `thumb ${features.thumbAngle}°` : `拇指开角 ${features.thumbAngle}°`}
              {' · '}
              {l === 'en' ? `spread ${features.openness}` : `五指张开度 ${features.openness}`}
            </dd>
            <dt>{t.fingersLabel}</dt>
            <dd>
              {features.fingers
                .map((finger) => `${FINGER_TEXT[finger.finger][l]} ${finger.ratioToSaturn}`)
                .join(l === 'en' ? ', ' : '、')}
            </dd>
            {features.strongPalaces.length > 0 && (
              <>
                <dt>{t.palacesLabel}</dt>
                <dd>{features.strongPalaces.map((palace) => PALACE_TEXT[palace][l]).join(l === 'en' ? ', ' : '、')}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {features && context && (
        <ReadingPanel
          copy={copy}
          readingKey={`palm-${round}-${language}`}
          system={palmSystemPrompt(language)}
          user={`Question: ${question || '(none)'}\n\n${JSON.stringify(context, null, 1)}`}
          offline={palmOffline(context)}
          header={`${copy.appName} · ${t.eyebrow}\n${question}\n\n${SHAPE_TEXT[features.shape][l]}`}
        />
      )}
    </main>
  )
}

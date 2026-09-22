import { useRef, useState } from 'react'
import { Camera, Image as ImageIcon, ScanFace } from 'lucide-react'
import { COURT_TEXT, ELEMENT_TEXT, FACE_PALACE_TEXT, faceFeatures, type FaceFeatures, type Point } from '../engines/face/face'
import type { UICopy } from '../i18n'
import { faceContext, faceOffline, faceSystemPrompt } from '../lib/contexts'
import { detectFace } from '../lib/face-detect'
import type { ReadingLanguage } from '../types'
import { ReadingPanel } from './ReadingPanel'

interface FaceScreenProps {
  copy: UICopy
  language: ReadingLanguage
}

type Phase = 'idle' | 'analysing' | 'found' | 'noface'

/** The outline points drawn over the photo, enough to show the reading grid. */
const GUIDES = [10, 152, 234, 454, 172, 397, 127, 356, 33, 133, 362, 263, 105, 334, 107, 336, 46, 276, 1, 2, 129, 358, 61, 291]

export function FaceScreen({ copy, language }: FaceScreenProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [landmarks, setLandmarks] = useState<Point[] | null>(null)
  const [features, setFeatures] = useState<FaceFeatures | null>(null)
  const [question, setQuestion] = useState('')
  const [round, setRound] = useState(0)
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const t = copy.face
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
      const found = await detectFace(image)
      setLandmarks(found)
      setPhase(found ? 'found' : 'noface')
    } catch (error) {
      console.warn('face detection failed', error)
      setLandmarks(null)
      setPhase('noface')
    }
  }

  const read = () => {
    if (!landmarks) return
    setFeatures(faceFeatures(landmarks))
    setRound((current) => current + 1)
  }

  const context = features ? faceContext(features, language, question) : null

  return (
    <main className="screen face-screen">
      <header className="screen-heading">
        <span className="eyebrow">{t.eyebrow}</span>
        <h1>{t.title}</h1>
        <p className="body">{t.hint}</p>
      </header>

      <section className="panel">
        <div className="chip-row">
          <button type="button" className="chip" onClick={() => cameraRef.current?.click()}>
            <Camera size={16} /> {t.takePhoto}
          </button>
          <button type="button" className="chip" onClick={() => fileRef.current?.click()}>
            <ImageIcon size={16} /> {t.choosePhoto}
          </button>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="user" hidden onChange={(event) => void onFile(event.target.files?.[0])} />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => void onFile(event.target.files?.[0])} />

        {imageUrl && (
          <div className="palm-photo">
            <img src={imageUrl} alt="" />
            {landmarks && (
              <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="palm-overlay" aria-hidden="true">
                {GUIDES.map((index) => (
                  <circle key={index} cx={landmarks[index].x} cy={landmarks[index].y} r={0.006} />
                ))}
              </svg>
            )}
            {phase === 'analysing' && <p className="palm-status">{t.analysing}</p>}
          </div>
        )}
        {phase === 'noface' && <p className="status failed">{t.noFace}</p>}
      </section>

      {phase === 'found' && landmarks && (
        <section className="panel">
          <label className="field">
            <span>{copy.common.question}</span>
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={copy.common.questionPlaceholder} rows={2} />
          </label>
          <button type="button" className="primary-button" onClick={read} data-testid="face-read">
            <ScanFace size={16} /> {t.read}
          </button>
        </section>
      )}

      {features && (
        <section className="panel">
          <dl className="facts" data-testid="face-facts">
            <dt>{t.element}</dt>
            <dd>
              {ELEMENT_TEXT[features.element][l]} · {ELEMENT_TEXT[features.element].keywords[l].join(l === 'en' ? ', ' : '、')}
            </dd>
            <dt>{t.courts}</dt>
            <dd>
              {features.courts.map((court) => `${COURT_TEXT[court.court][l]} ${Math.round(court.share * 100)}%`).join(l === 'en' ? ' · ' : '，')}
            </dd>
            <dt>{t.proportions}</dt>
            <dd>
              {l === 'en'
                ? `${features.eyesAcross} eyes across, gap ${features.eyeGap}, symmetry ${features.symmetry}`
                : `面宽 ${features.eyesAcross} 眼，眼距 ${features.eyeGap}，对称 ${features.symmetry}`}
            </dd>
            {features.strongPalaces.length > 0 && (
              <>
                <dt>{t.palaces}</dt>
                <dd>{features.strongPalaces.map((palace) => FACE_PALACE_TEXT[palace][l]).join(l === 'en' ? ', ' : '、')}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {features && context && (
        <ReadingPanel
          copy={copy}
          readingKey={`face-${round}-${language}`}
          system={faceSystemPrompt(language)}
          user={`Question: ${question || '(none)'}\n\n${JSON.stringify(context, null, 1)}`}
          offline={faceOffline(context)}
          header={`${copy.appName} · ${t.eyebrow}\n${question}\n\n${ELEMENT_TEXT[features.element][l]}`}
        />
      )}
    </main>
  )
}

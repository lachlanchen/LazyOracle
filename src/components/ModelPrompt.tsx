import { useState } from 'react'
import { Cloud, Download } from 'lucide-react'
import { DEVICE_MODELS, loadDeviceModel, selectDeviceModel, type LoadPhase } from '../lib/device-model'
import { loadModelSettings, saveModelSettings } from '../lib/llm'
import type { UICopy } from '../i18n'
import type { ReadingLanguage } from '../types'

interface ModelPromptProps {
  copy: UICopy
  language: ReadingLanguage
  /** Called once a model is running or the cloud has been switched on. */
  onReady: () => void
  onDismiss?: () => void
}

/**
 * Offers the two downloadable models and Tianji Cloud. Shown when a reading
 * would otherwise have no model to write it: on the home screen as a card the
 * reader can dismiss, and in the chat screen, where a model is required.
 */
export function ModelPrompt({ copy, language, onReady, onDismiss }: ModelPromptProps) {
  const [progress, setProgress] = useState<{ id: string; fraction: number; phase: LoadPhase } | null>(null)
  const [error, setError] = useState('')
  const l = language === 'en' ? 'en' : 'zh'
  const t = copy.modelPrompt
  const s = copy.settings

  const download = async (id: string) => {
    const option = DEVICE_MODELS.find((model) => model.id === id)
    if (!option || progress) return
    setError('')
    selectDeviceModel(id)
    setProgress({ id, fraction: 0, phase: 'download' })
    try {
      await loadDeviceModel(option, (fraction, phase) => setProgress({ id, fraction, phase }))
      onReady()
    } catch (loadError) {
      console.warn('model download failed', loadError)
      selectDeviceModel(null)
      setError(loadError instanceof Error ? loadError.message : String(loadError))
    } finally {
      setProgress(null)
    }
  }

  const useCloud = () => {
    const next = { ...loadModelSettings(), endpointEnabled: true }
    saveModelSettings(next)
    onReady()
  }

  return (
    <section className="panel model-prompt">
      <h2>{t.title}</h2>
      <p className="body">{t.body}</p>
      <ul className="model-list">
        {DEVICE_MODELS.map((option) => {
          const busy = progress?.id === option.id
          return (
            <li key={option.id}>
              <div>
                <b>{option.name[l]}</b>
                <small>{option.sizeMb} MB · {option.note[l]}</small>
                {busy && (
                  <span className="progress" aria-label={progress.phase === 'prepare' ? s.preparing : s.downloading}>
                    <span style={{ width: `${Math.round(progress.fraction * 100)}%` }} />
                  </span>
                )}
              </div>
              {busy ? (
                <span className="status">
                  {progress.phase === 'prepare' ? s.preparing : `${s.downloading} ${Math.round(progress.fraction * 100)}%`}
                </span>
              ) : (
                <button type="button" className="ghost-button" disabled={Boolean(progress)} onClick={() => void download(option.id)} data-testid={`prompt-${option.id}`}>
                  <Download size={16} /> {s.download}
                </button>
              )}
            </li>
          )
        })}
        <li>
          <div>
            <b>{s.cloudTitle}</b>
            <small>{t.cloudNote}</small>
          </div>
          <button type="button" className="ghost-button" onClick={useCloud} data-testid="prompt-cloud">
            <Cloud size={16} /> {t.useCloud}
          </button>
        </li>
      </ul>
      {error && <p className="status failed">{error}</p>}
      {onDismiss && (
        <button type="button" className="link-button" onClick={onDismiss}>
          {t.later}
        </button>
      )}
    </section>
  )
}

import { useEffect, useState } from 'react'
import { languageLabels, type UICopy } from '../i18n'
import { DEVICE_MODELS, deviceModelLoadedId, loadDeviceModel, selectDeviceModel, selectedDeviceModel, unloadDeviceModel, type LoadPhase } from '../lib/device-model'
import { loadModelSettings, saveModelSettings, type ModelSettings } from '../lib/llm'
import { clearProfile, loadProfile } from '../lib/profile'
import type { ReadingLanguage } from '../types'

interface SettingsProps {
  copy: UICopy
  language: ReadingLanguage
  onLanguage: (language: ReadingLanguage) => void
  /** Name of a model whose last load crashed the app, if that just happened. */
  modelNotice?: string
  onDismissNotice?: () => void
}

export function Settings({ copy, language, onLanguage, modelNotice, onDismissNotice }: SettingsProps) {
  const [settings, setSettings] = useState<ModelSettings>(() => loadModelSettings())
  const [deviceId, setDeviceId] = useState<string | null>(() => selectedDeviceModel()?.id ?? null)
  const [progress, setProgress] = useState<{ id: string; fraction: number; phase: LoadPhase } | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(() => deviceModelLoadedId())
  const [hasProfile, setHasProfile] = useState(() => loadProfile() !== null)
  const [deviceError, setDeviceError] = useState('')
  const l = language === 'en' ? 'en' : 'zh'
  const t = copy.settings

  useEffect(() => {
    // Resume loading a previously chosen model when Settings opens.
    const chosen = selectedDeviceModel()
    if (chosen && deviceModelLoadedId() !== chosen.id) void activateModel(chosen.id)
     
  }, [])

  async function activateModel(id: string) {
    const option = DEVICE_MODELS.find((m) => m.id === id)
    if (!option) return
    setDeviceError('')
    selectDeviceModel(id)
    setDeviceId(id)
    setProgress({ id, fraction: 0, phase: 'download' })
    try {
      await loadDeviceModel(option, (fraction, phase) => setProgress({ id, fraction, phase }))
      setLoadedId(id)
    } catch (error) {
      console.warn('device model failed', error)
      setDeviceError(error instanceof Error ? error.message : String(error))
      selectDeviceModel(null)
      setDeviceId(null)
    } finally {
      setProgress(null)
    }
  }

  const stopModel = async () => {
    selectDeviceModel(null)
    setDeviceId(null)
    await unloadDeviceModel()
    setLoadedId(null)
  }

  return (
    <main className="screen settings-screen">
      <header className="screen-heading">
        <h1>{t.title}</h1>
      </header>

      <section className="panel">
        <h2>{t.language}</h2>
        <div className="chip-row" role="group" aria-label={t.language}>
          {(Object.keys(languageLabels) as ReadingLanguage[]).map((item) => (
            <button key={item} type="button" className={item === language ? 'chip active' : 'chip'} aria-pressed={item === language} onClick={() => onLanguage(item)}>
              {languageLabels[item]}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>{t.model}</h2>
        <p className="body">{t.modelBody}</p>
        <h3 className="sub">{t.cloudTitle}</h3>
        <p className="body">{t.cloudBody}</p>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.endpointEnabled}
            onChange={(event) => {
              const next = { ...settings, endpointEnabled: event.target.checked }
              setSettings(next)
              saveModelSettings(next)
            }}
            data-testid="cloud-enabled"
          />
          <span>{t.cloudEnabled}</span>
        </label>
        {modelNotice && (
          <p className="status failed">
            {t.modelCrashed.replace('{model}', modelNotice)}{' '}
            <button type="button" className="link-button" onClick={onDismissNotice}>{t.dismiss}</button>
          </p>
        )}
        <h3 className="sub">{t.deviceModel}</h3>
        <p className="body">{t.deviceModelBody}</p>
        <ul className="model-list" data-testid="device-models">
          <li className={deviceId === null ? 'active' : ''}>
            <div>
              <b>{t.none}</b>
            </div>
            {deviceId !== null && (
              <button type="button" className="ghost-button" onClick={() => void stopModel()}>{t.remove}</button>
            )}
          </li>
          {DEVICE_MODELS.map((option) => {
            const active = deviceId === option.id
            const loading = progress?.id === option.id
            return (
              <li key={option.id} className={active ? 'active' : ''}>
                <div>
                  <b>{option.name[l]}</b>
                  <small>{option.sizeMb} MB · {option.note[l]}</small>
                  {loading && (
                    <span className="progress" aria-label={progress?.phase === 'prepare' ? t.preparing : t.downloading}>
                      <span style={{ width: `${Math.round((progress?.fraction ?? 0) * 100)}%` }} />
                    </span>
                  )}
                </div>
                {active && loadedId === option.id && !loading ? (
                  <span className="status ok">{t.loaded}</span>
                ) : loading ? (
                  <span className="status">
                    {progress?.phase === 'prepare' ? t.preparing : `${t.downloading} ${Math.round((progress?.fraction ?? 0) * 100)}%`}
                  </span>
                ) : (
                  <button type="button" className="ghost-button" onClick={() => void activateModel(option.id)} data-testid={`use-${option.id}`}>
                    {t.download}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        {deviceError && <p className="status failed">{deviceError}</p>}
      </section>

      <section className="panel">
        <h2>{t.profileTitle}</h2>
        <p className="body">{copy.profile.body}</p>
        <button
          type="button"
          className="ghost-button"
          disabled={!hasProfile}
          onClick={() => {
            clearProfile()
            setHasProfile(false)
          }}
        >
          {t.clearProfile}
        </button>
      </section>

      <section className="panel">
        <h2>{t.privacyTitle}</h2>
        <p className="body">{t.privacy}</p>
      </section>

      <section className="panel">
        <h2>{t.disclaimerTitle}</h2>
        <p className="body">{t.disclaimer}</p>
        <p className="body about">{t.about} · v{__APP_VERSION__}</p>
      </section>
    </main>
  )
}

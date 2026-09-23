import { useState } from 'react'
import { languageLabels, type UICopy } from '../i18n'
import { loadModelSettings, saveModelSettings, type ModelSettings } from '../lib/llm'
import { clearProfile, loadProfile } from '../lib/profile'
import type { ReadingLanguage } from '../types'

interface SettingsProps {
  copy: UICopy
  language: ReadingLanguage
  onLanguage: (language: ReadingLanguage) => void
}

export function Settings({ copy, language, onLanguage }: SettingsProps) {
  const [settings, setSettings] = useState<ModelSettings>(() => loadModelSettings())
  const [hasProfile, setHasProfile] = useState(() => loadProfile() !== null)
  const t = copy.settings

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

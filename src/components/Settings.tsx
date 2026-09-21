import { useState } from 'react'
import { languageLabels, type UICopy } from '../i18n'
import { chatWithEndpoint, loadModelSettings, saveModelSettings, type ModelSettings } from '../lib/llm'
import type { ReadingLanguage } from '../types'

interface SettingsProps {
  copy: UICopy
  language: ReadingLanguage
  onLanguage: (language: ReadingLanguage) => void
}

export function Settings({ copy, language, onLanguage }: SettingsProps) {
  const [settings, setSettings] = useState<ModelSettings>(() => loadModelSettings())
  const [status, setStatus] = useState<'idle' | 'saved' | 'testing' | 'ok' | 'failed'>('idle')

  const update = (patch: Partial<ModelSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
    setStatus('idle')
  }

  const save = () => {
    saveModelSettings(settings)
    setStatus('saved')
  }

  const test = async () => {
    setStatus('testing')
    try {
      const text = await chatWithEndpoint({ ...settings, endpointEnabled: true }, { system: 'Reply with the single word: ready', user: 'ready?' })
      setStatus(text.trim() ? 'ok' : 'failed')
    } catch {
      setStatus('failed')
    }
  }

  return (
    <main className="screen settings-screen">
      <header className="screen-heading">
        <h1>{copy.settings.title}</h1>
      </header>

      <section className="panel">
        <h2>{copy.settings.language}</h2>
        <div className="chip-row" role="group" aria-label={copy.settings.language}>
          {(Object.keys(languageLabels) as ReadingLanguage[]).map((item) => (
            <button key={item} type="button" className={item === language ? 'chip active' : 'chip'} aria-pressed={item === language} onClick={() => onLanguage(item)}>
              {languageLabels[item]}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>{copy.settings.model}</h2>
        <p className="body">{copy.settings.modelBody}</p>
        <label className="switch">
          <input type="checkbox" checked={settings.endpointEnabled} onChange={(event) => update({ endpointEnabled: event.target.checked })} data-testid="endpoint-enabled" />
          <span>{copy.settings.endpointEnabled}</span>
        </label>
        <label className="field">
          <span>{copy.settings.endpointUrl}</span>
          <input type="url" value={settings.endpointUrl} onChange={(event) => update({ endpointUrl: event.target.value })} placeholder="https://oracle.lazying.art/v1" data-testid="endpoint-url" />
        </label>
        <label className="field">
          <span>{copy.settings.endpointToken}</span>
          <input type="password" value={settings.endpointToken} onChange={(event) => update({ endpointToken: event.target.value })} autoComplete="off" />
        </label>
        <label className="field">
          <span>{copy.settings.modelName}</span>
          <input type="text" value={settings.model} onChange={(event) => update({ model: event.target.value })} />
        </label>
        <div className="button-row">
          <button type="button" className="ghost-button" onClick={test} disabled={status === 'testing'}>
            {status === 'testing' ? copy.settings.testing : copy.settings.test}
          </button>
          <button type="button" className="primary-button" onClick={save} data-testid="settings-save">
            {status === 'saved' ? copy.settings.saved : copy.settings.save}
          </button>
        </div>
        {status === 'ok' && <p className="status ok">{copy.settings.testOk}</p>}
        {status === 'failed' && <p className="status failed">{copy.settings.testFailed}</p>}
      </section>

      <section className="panel">
        <h2>{copy.settings.privacyTitle}</h2>
        <p className="body">{copy.settings.privacy}</p>
      </section>

      <section className="panel">
        <h2>{copy.settings.disclaimerTitle}</h2>
        <p className="body">{copy.settings.disclaimer}</p>
      </section>
    </main>
  )
}

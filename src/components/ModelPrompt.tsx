import { Cloud } from 'lucide-react'
import { loadModelSettings, saveModelSettings } from '../lib/llm'
import type { UICopy } from '../i18n'

interface ModelPromptProps {
  copy: UICopy
  onReady: () => void
}

/** Let readers explicitly enable cloud chat after switching it off. */
export function ModelPrompt({ copy, onReady }: ModelPromptProps) {
  const t = copy.modelPrompt
  return (
    <section className="panel model-prompt">
      <h2>{t.title}</h2>
      <p className="body">{t.body}</p>
      <p className="body">{t.cloudNote}</p>
      <button type="button" className="ghost-button" data-testid="prompt-cloud" onClick={() => {
        saveModelSettings({ ...loadModelSettings(), endpointEnabled: true })
        onReady()
      }}>
        <Cloud size={16} /> {t.useCloud}
      </button>
    </section>
  )
}

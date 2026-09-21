import { useEffect, useRef, useState } from 'react'
import { Copy } from 'lucide-react'
import type { UICopy } from '../i18n'
import { renderInline } from '../lib/markdown'
import { generateReading, type ReadingSource } from '../lib/readings'

interface ReadingPanelProps {
  copy: UICopy
  /** Changes when a new reading should start (e.g. the draw's seed). */
  readingKey: string
  system: string
  user: string
  offline: string
  /** Text placed above the reading when copied (the structured facts). */
  header: string
  /** Shown next to the title, e.g. a seed. */
  tag?: string
  title?: string
}

export function ReadingPanel({ copy, readingKey, system, user, offline, header, tag, title }: ReadingPanelProps) {
  const [state, setState] = useState<{ source: ReadingSource; text: string; done: boolean }>({ source: 'none', text: '', done: false })
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const copied = copiedKey === readingKey
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    generateReading({ system, user, offline, signal: controller.signal }, (update) => {
      if (!controller.signal.aborted) setState(update)
    })
    return () => controller.abort()
    // The prompts are derived from readingKey; re-running on every prompt string change would loop on streaming updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingKey])

  const copyReading = async () => {
    try {
      await navigator.clipboard.writeText(`${header}\n\n${state.text}`)
      setCopiedKey(readingKey)
    } catch {
      setCopiedKey(null)
    }
  }

  return (
    <section className="panel reading-panel" aria-live="polite" data-testid="reading">
      <header>
        <h2>{title ?? copy.reading.title}</h2>
        {tag && <span className="seed">{tag}</span>}
      </header>
      {state.source === 'none' || (state.source === 'model' && !state.text) ? (
        <p className="thinking">{copy.reading.thinking}</p>
      ) : (
        <div className="reading-text">
          {state.text.split(/\n{2,}/).map((paragraph, index) => (
            <p key={index}>{renderInline(paragraph)}</p>
          ))}
        </div>
      )}
      {state.source === 'offline' && <p className="offline-note">{copy.reading.offlineNote}</p>}
      {state.done && (
        <button type="button" className="ghost-button" onClick={copyReading}>
          <Copy size={16} /> {copied ? copy.reading.copied : copy.reading.share}
        </button>
      )}
    </section>
  )
}

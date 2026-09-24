import { useEffect, useRef, useState } from 'react'
import { Copy, Sparkles } from 'lucide-react'
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
  const [question, setQuestion] = useState('')
  const [detail, setDetail] = useState<{ key: string; question: string; previous: string } | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const explaining = detail?.key === readingKey ? detail : null
    const baseSystem = explaining
      ? system.split("\n").filter(line => !/^(Structure|Length):/.test(line)).join("\n")
      : system
    generateReading({
      system: `${baseSystem}\nUse everyday language, briefly explain unfamiliar terms, and lead with what this means for the reader. Stay mainly in the selected language; occasional useful traditional terms are fine, but do not duplicate translations or switch languages repeatedly. If no question is supplied, give a general reflection and invite a concrete question; do not invent a concern. Never invent people, circumstances, deadlines or waiting periods. Avoid commands or absolute predictions. Individual I Ching line verses may be absent: describe only the supplied line positions and reading-focus rule, never present a generic position meaning as a quoted line verse.${explaining ? " For this follow-up, replace the earlier structure and length requirements: use two or three short paragraphs in everyday language. Lead with the answer, explain only two relevant facts and one practical next step. Do not quote classical text unless asked, catalogue related hexagrams, or narrate seeds, timestamps or raw arrays." : ""}`,
      user: explaining
        ? `${user}\n\n${copy.reading.explainPrompt}\n${explaining.question ? `Follow-up question: ${explaining.question}\n` : ''}${explaining.previous ? `Previous explanation for context: ${explaining.previous}` : ''}`
        : user,
      offline, signal: controller.signal, forceCloud: Boolean(explaining),
    }, (update) => {
      if (!controller.signal.aborted) setState(update)
    })
    return () => controller.abort()
    // The prompts are derived from readingKey; re-running on every prompt string change would loop on streaming updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingKey, detail])

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
      <form className="reading-explain" onSubmit={(event) => {
        event.preventDefault()
        if (!state.done) return
        setDetail({ key: readingKey, question: question.trim(), previous: state.text })
        setQuestion('')
      }}>
        <label className="field">
          <span>{copy.reading.followup}</span>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={2} data-testid="reading-followup" />
        </label>
        <button type="submit" className="primary-button" disabled={!state.done} data-testid="reading-explain">
          <Sparkles size={18} /> {copy.reading.explain}
        </button>
      </form>
      {state.done && (
        <button type="button" className="ghost-button" onClick={copyReading}>
          <Copy size={16} /> {copied ? copy.reading.copied : copy.reading.share}
        </button>
      )}
    </section>
  )
}

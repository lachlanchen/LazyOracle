import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Sparkles, Square } from 'lucide-react'
import type { UICopy } from '../i18n'
import { renderInline } from '../lib/markdown'
import { generateReading, type ReadingSource } from '../lib/readings'
import { readPracticeState, savePracticeState, usePracticeState, readingFingerprint } from '../lib/practice-state'

interface ReadingPanelProps {
  copy: UICopy
  readingKey: string
  system: string
  user: string
  offline: string
  header: string
  tag?: string
  title?: string
}
type ReadingState = { source: ReadingSource; text: string; done: boolean }
type PastReply = { question: string; answer: string }

export function ReadingPanel(props: ReadingPanelProps) {
  const key = props.readingKey + '-' + readingFingerprint(props.user)
  return <SavedReadingPanel key={key} {...props} cacheKey={key} />
}

function SavedReadingPanel({ copy, readingKey, cacheKey, system, user, offline, header, tag, title }: ReadingPanelProps & { cacheKey: string }) {
  const stateKey = `explanation.${cacheKey}.answer`
  const [state, setState] = useState<ReadingState>(() => readPracticeState(stateKey, { source: 'none', text: '', done: false }))
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const [question, setQuestion] = usePracticeState(`explanation.${cacheKey}.draft`, '')
  const [history, setHistory] = usePracticeState<PastReply[]>(`explanation.${cacheKey}.history`, [])
  const [detail, setDetail] = useState<{ question: string; previous: string } | null>(null)

  useEffect(() => {
    // Returning to this practice restores its completed reading without another
    // network request or a new deterministic draw.
    if (!detail && readPracticeState<ReadingState | null>(stateKey, null)?.done) return
    const controller = new AbortController()
    abortRef.current = controller
    const baseSystem = detail ? system.split('\n').filter(line => !/^(Structure|Length):/.test(line)).join('\n') : system
    generateReading({
      system: `${baseSystem}\nUse everyday language and explain unfamiliar terms briefly. The selected language is the default; naturally follow the language the reader uses or explicitly requests. Occasional useful terms are fine, without unnecessary switching or duplicate translations. Do not invent a concern, people, circumstances, deadlines or absent I Ching line verses.${detail ? ' For this follow-up, use two or three short paragraphs. Answer first, explain two relevant facts and one practical next step. Do not catalogue symbols or narrate seeds, timestamps or raw fields.' : ''}`,
      user: detail ? `${user}\n\n${copy.reading.explainPrompt}\n${detail.question ? `Follow-up question: ${detail.question}\n` : ''}${detail.previous ? `Previous explanation for context: ${detail.previous}` : ''}` : user,
      offline, signal: controller.signal, forceCloud: Boolean(detail),
    }, update => {
      if (controller.signal.aborted) return
      setState(update)
      if (update.done) savePracticeState(stateKey, update)
    })
    return () => controller.abort()
    // Props are immutable within this exact-result cache key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail])

  const copyReading = async () => {
    try { await navigator.clipboard.writeText(`${header}\n\n${history.map(h => `${h.question}\n${h.answer}`).join('\n\n')}\n\n${state.text}`); setCopied(true) }
    catch { setCopied(false) }
  }

  const composer = <form className="reading-explain reading-dock" data-testid="reading-dock" onSubmit={event => {
    event.preventDefault()
    if (!state.done) {
      abortRef.current?.abort()
      const stopped = { ...state, done: true }
      setState(stopped)
      if (stopped.text) savePracticeState(stateKey, stopped)
      return
    }
    const asked = question.trim()
    if (state.text) setHistory([...history, { question: detail?.question ?? '', answer: state.text }])
    setDetail({ question: asked, previous: state.text })
    setQuestion('')
    ;(document.activeElement as HTMLElement | null)?.blur()
    document.querySelector('[data-testid="reading"]')?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }}>
    <label className="field">
      <span>{copy.reading.followup}</span>
      <textarea value={question} onChange={event => setQuestion(event.target.value)} rows={1} data-testid="reading-followup" />
    </label>
    <button type="submit" className="primary-button" data-testid="reading-explain">
      {state.done ? <Sparkles size={18} /> : <Square size={18} />} {state.done ? copy.reading.explain : copy.chat.stop}
    </button>
  </form>

  return <section className="panel reading-panel" aria-live="polite" data-testid="reading" data-reading-key={readingKey}>
    <header><h2>{title ?? copy.reading.title}</h2>{tag && <span className="seed">{tag}</span>}</header>
    {history.map((reply, i) => <div className="reading-text" key={i}>
      {reply.question && <p className="reading-question">{reply.question}</p>}
      {reply.answer.split(/\n{2,}/).map((paragraph, n) => <p key={n}>{renderInline(paragraph)}</p>)}
    </div>)}
    {detail?.question && <p className="reading-question">{detail.question}</p>}
    {!state.done && !state.text ? <p className="thinking">{copy.reading.thinking}</p> :
      <div className="reading-text">{state.text.split(/\n{2,}/).map((paragraph, i) => <p key={i}>{renderInline(paragraph)}</p>)}</div>}
    {state.source === 'offline' && <p className="offline-note">{copy.reading.offlineNote}</p>}
    {createPortal(composer, document.body)}
    {state.done && <button type="button" className="ghost-button" onClick={copyReading}><Copy size={16} /> {copied ? copy.reading.copied : copy.reading.share}</button>}
  </section>
}

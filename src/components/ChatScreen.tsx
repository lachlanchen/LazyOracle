import { useRef, useState } from 'react'
import { Send, Square, Trash2 } from 'lucide-react'
import type { UICopy } from '../i18n'
import { renderInline } from '../lib/markdown'
import type { ChatMessage } from '../lib/llm'
import { chatAvailable, generateChat } from '../lib/readings'
import type { ReadingLanguage } from '../types'
import { ModelPrompt } from './ModelPrompt'

interface ChatScreenProps {
  copy: UICopy
  language: ReadingLanguage
}

function systemPrompt(language: ReadingLanguage): string {
  if (language === 'en') {
    return [
      'You are Tianji, the reader inside LazyOracle. You talk with the person about tarot, BaZi (four pillars), the I Ching, astrology, feng shui, palmistry and the book of answers.',
      'Answer in English, warmly and plainly, in at most 180 words unless more is asked for.',
      'Be concrete about the tradition you are speaking from, and name it. If a question needs a chart, a spread or a cast the app can produce, say which screen to use rather than inventing the result.',
      'Never invent cards, hexagrams, pillars or dates that were not given to you. Treat all of this as a mirror for reflection, not prediction, and say so only when it matters.',
    ].join(' ')
  }
  return [
    '你是「天机」，LazyOracle 中的解读者。你与来访者谈论塔罗、四柱八字、周易、星座、风水、手相与答案之书。',
    '用简体中文回答，语气温和直白，除非对方要求，否则不超过 250 字。',
    '说明你所依据的术数传统并点明其名。若问题需要排盘、抽牌或起卦，请指出应使用应用中的哪个页面，而不要凭空给出结果。',
    '不要编造未曾给出的牌、卦、四柱或日期。这一切是用来自省的镜子，而非预言；仅在必要时提醒一次。',
  ].join('')
}

export function ChatScreen({ copy, language }: ChatScreenProps) {
  const [ready, setReady] = useState(() => chatAvailable())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const abort = useRef<AbortController | null>(null)
  const t = copy.chat

  if (!ready) {
    return (
      <main className="screen chat-screen">
        <header className="screen-heading">
          <span className="eyebrow">{t.eyebrow}</span>
          <h1>{t.title}</h1>
        </header>
        <ModelPrompt copy={copy} language={language} onReady={() => setReady(true)} />
      </main>
    )
  }

  const send = async () => {
    const question = draft.trim()
    if (!question || busy) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: question }]
    setMessages(next)
    setDraft('')
    setError('')
    setBusy(true)
    setStreaming('')
    const controller = new AbortController()
    abort.current = controller
    try {
      await generateChat(
        [{ role: 'system', content: systemPrompt(language) }, ...next],
        (update) => {
          setStreaming(update.text)
          if (update.done) {
            setMessages([...next, { role: 'assistant', content: update.text }])
            setStreaming('')
          }
        },
        controller.signal,
      )
    } catch (chatError) {
      if (!controller.signal.aborted) {
        console.warn('chat failed', chatError)
        setError(t.failed)
      }
    } finally {
      abort.current = null
      setBusy(false)
    }
  }

  const stop = () => {
    abort.current?.abort()
    if (streaming) setMessages((current) => [...current, { role: 'assistant', content: streaming }])
    setStreaming('')
    setBusy(false)
  }

  return (
    <main className="screen chat-screen">
      <header className="screen-heading">
        <span className="eyebrow">{t.eyebrow}</span>
        <h1>{t.title}</h1>
      </header>

      <section className="panel chat-log" data-testid="chat-log">
        {messages.length === 0 && !streaming && <p className="body">{t.opening}</p>}
        {messages.map((message, index) => (
          <p key={index} className={message.role === 'user' ? 'chat-bubble mine' : 'chat-bubble'}>
            {renderInline(message.content)}
          </p>
        ))}
        {streaming && <p className="chat-bubble">{renderInline(streaming)}</p>}
        {busy && !streaming && <p className="chat-bubble thinking">{t.thinking}</p>}
        {error && <p className="status failed">{error}</p>}
      </section>

      <section className="panel chat-compose">
        <label className="field">
          <span className="sr-only">{t.placeholder}</span>
          <textarea
            value={draft}
            rows={2}
            placeholder={t.placeholder}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void send()
            }}
            data-testid="chat-input"
          />
        </label>
        <div className="chat-actions">
          {busy ? (
            <button type="button" className="ghost-button" onClick={stop}>
              <Square size={16} /> {t.stop}
            </button>
          ) : (
            <button type="button" className="primary-button" onClick={() => void send()} disabled={!draft.trim()} data-testid="chat-send">
              <Send size={16} /> {t.send}
            </button>
          )}
          {messages.length > 0 && !busy && (
            <button type="button" className="ghost-button" onClick={() => setMessages([])}>
              <Trash2 size={16} /> {t.clear}
            </button>
          )}
        </div>
      </section>
    </main>
  )
}

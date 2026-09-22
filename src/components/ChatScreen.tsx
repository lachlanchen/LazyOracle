import { useEffect, useRef, useState } from 'react'
import { History, Plus, Send, Square, Trash2, Wand2 } from 'lucide-react'
import type { UICopy } from '../i18n'
import { MAX_STEPS, parseToolCall, runTool, toolInstructions, toolResultMessage, toolSchemas } from '../lib/agent'
import { conversationTitle, deleteConversation, loadConversations, newConversationId, saveConversation, type Conversation } from '../lib/chat-store'
import type { ChatMessage, ToolCallRequest } from '../lib/llm'
import { renderInline } from '../lib/markdown'
import { chatAvailable, fitToBudget, generateChat, historyBudget, summariseTurns } from '../lib/readings'
import type { ReadingLanguage } from '../types'
import { ModelPrompt } from './ModelPrompt'

interface ChatScreenProps {
  copy: UICopy
  language: ReadingLanguage
  /** A question typed into the bar at the bottom of another screen. */
  pending?: string
  /** Called once that question has been taken up. */
  onPendingConsumed?: () => void
}

/** How many turns are drawn at once; older ones load when asked for. */
const VISIBLE_TURNS = 24

/** A line in the visible conversation. Tool lines record what was actually run. */
interface Turn {
  role: 'user' | 'assistant' | 'tool'
  content: string
}

function persona(language: ReadingLanguage): string {
  if (language === 'en') {
    return [
      'You are Tianji, the reader inside LazyOracle. You work with tarot, BaZi (four pillars), the I Ching, astrology, feng shui, palmistry, face reading and the two books.',
      'Answer in English, warmly and plainly, in at most 200 words unless more is asked for.',
      'Name the tradition you are reading from, and base every claim on facts you were given or that a tool returned.',
      'Treat all of this as a mirror for reflection rather than prediction, and say so only when it matters. No medical, legal or financial promises.',
    ].join(' ')
  }
  return [
    '你是「天机」，LazyOracle 中的解读者。你精通塔罗、四柱八字、周易、星座、风水、手相、面相与两本书。',
    '用简体中文回答，语气温和直白，除非对方要求，否则不超过 300 字。',
    '点明你所依据的术数传统；每一句判断都要基于给定的事实或工具返回的结果。',
    '这一切是用来自省的镜子，而非预言，仅在必要时提醒一次。不做医疗、法律或财务上的承诺。',
  ].join('')
}

export function ChatScreen({ copy, language, pending, onPendingConsumed }: ChatScreenProps) {
  const [ready, setReady] = useState(() => chatAvailable())
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations())
  // Opening the chat continues where the reader left off. A conversation
  // accumulates until they deliberately start a new one, so the model keeps
  // the earlier questions as context.
  const [turns, setTurns] = useState<Turn[]>(() => (loadConversations()[0]?.turns as Turn[] | undefined) ?? [])
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [shown, setShown] = useState(VISIBLE_TURNS)
  // What the model was told about the turns that no longer fit its context.
  const summary = useRef<string>(loadConversations()[0]?.summary ?? '')
  const summarised = useRef<number>(loadConversations()[0]?.summarised ?? 0)
  const conversationId = useRef(loadConversations()[0]?.id ?? newConversationId())
  const abort = useRef<AbortController | null>(null)
  const asked = useRef('')
  const t = copy.chat

  /**
   * Streams one reply. A provider that supports function calling answers with
   * tool calls; a model on the phone writes them as a line of text instead.
   * Neither is shown to the reader.
   */
  const ask = async (messages: ChatMessage[], signal: AbortSignal): Promise<{ text: string; calls: ToolCallRequest[] }> => {
    let latest = ''
    let calls: ToolCallRequest[] = []
    await generateChat(
      messages,
      (update) => {
        latest = update.text
        if (update.toolCalls?.length) calls = update.toolCalls
        setStreaming(update.text.trimStart().startsWith('<tool') ? '' : update.text)
      },
      signal,
      toolSchemas(language),
    )
    return { text: latest, calls }
  }

  const remember = (finished: Turn[]) => {
    if (finished.length === 0) return
    setConversations(
      saveConversation({
        id: conversationId.current,
        title: conversationTitle(finished),
        turns: finished,
        updatedAt: Date.now(),
        summary: summary.current || undefined,
        summarised: summarised.current || undefined,
      }),
    )
  }

  /**
   * Keeps the conversation sendable however long it grows: everything the
   * reader can see is kept, while the part that no longer fits the model's
   * context is folded into a short account written by the model.
   */
  const compact = async (all: Turn[], signal: AbortSignal) => {
    const pending = all.slice(summarised.current).filter((turn) => turn.role !== 'tool')
    const { older } = fitToBudget(pending, historyBudget())
    if (older.length < 2) return
    try {
      summary.current = await summariseTurns(summary.current, older, language, signal)
      summarised.current += older.length
    } catch (error) {
      // A failed summary is not worth interrupting the reader for; the next
      // turn simply sends a little less history.
      console.warn('could not compact the conversation', error)
      summarised.current += older.length
    }
  }

  /**
   * One exchange. The model may answer in words, or ask for one of the app's
   * engines; each tool call runs here on the device and its facts go back to
   * the model, up to `MAX_STEPS` times before it must answer.
   */
  const send = async (text?: string) => {
    const question = (text ?? draft).trim()
    if (!question || busy) return
    const visible: Turn[] = [...turns, { role: 'user', content: question }]
    setTurns(visible)
    setDraft('')
    setError('')
    setBusy(true)
    setStreaming('')
    const controller = new AbortController()
    abort.current = controller
    // Guards against a model that keeps asking for the same thing.
    const attempted = new Set<string>()

    // Everything the reader can see is kept. What travels with the question
    // is the summary of the older part plus as many recent turns as the
    // model's context allows.
    const pending = visible.slice(summarised.current).filter((turn) => turn.role !== 'tool')
    const { keep } = fitToBudget(pending, historyBudget())
    let working: ChatMessage[] = [
      { role: 'system', content: `${persona(language)}\n\n${toolInstructions(language)}` },
      ...(summary.current
        ? [{ role: 'system' as const, content: language === 'en' ? `Earlier in this conversation: ${summary.current}` : `此前的对话要点：${summary.current}` }]
        : []),
      ...keep.map((turn) => ({ role: turn.role === 'user' ? ('user' as const) : ('assistant' as const), content: turn.content })),
    ]

    try {
      for (let step = 0; step <= MAX_STEPS; step += 1) {
        const { text: reply, calls } = await ask(working, controller.signal)
        if (controller.signal.aborted) break
        const last = step >= MAX_STEPS

        // A provider with function calling: run each call it asked for.
        if (!last && calls.length > 0) {
          working = [
            ...working,
            { role: 'assistant', content: reply || null, tool_calls: calls.map((call) => ({ id: call.id, type: 'function' as const, function: { name: call.name, arguments: call.arguments } })) },
          ]
          for (const call of calls) {
            let args: Record<string, unknown> = {}
            try {
              args = call.arguments ? (JSON.parse(call.arguments) as Record<string, unknown>) : {}
            } catch {
              args = {}
            }
            const signature = `${call.name}:${JSON.stringify(args)}`
            if (attempted.has(signature)) {
              working = [...working, { role: 'tool', content: JSON.stringify({ ok: false, error: 'already called with these arguments; use the earlier result' }), tool_call_id: call.id, name: call.name }]
              continue
            }
            attempted.add(signature)
            const result = runTool({ name: call.name, arguments: args }, language)
            setTurns((current) => [...current, { role: 'tool', content: result.label }])
            working = [...working, { role: 'tool', content: result.output, tool_call_id: call.id, name: call.name }]
          }
          setStreaming('')
          continue
        }

        // A model on the phone writes the call as a line of text.
        const written = last ? null : parseToolCall(reply)
        if (written && attempted.has(`${written.name}:${JSON.stringify(written.arguments)}`)) {
          working = [...working, { role: 'assistant', content: reply }, { role: 'user', content: 'TOOL RESULT: that call was already made; use its result and answer now.' }]
          continue
        }
        if (written) {
          attempted.add(`${written.name}:${JSON.stringify(written.arguments)}`)
          const result = runTool(written, language)
          setTurns((current) => [...current, { role: 'tool', content: result.label }])
          setStreaming('')
          working = [...working, { role: 'assistant', content: reply }, { role: 'user', content: toolResultMessage(result) }]
          continue
        }

        setTurns((current) => {
          const next: Turn[] = [...current, { role: 'assistant', content: reply }]
          remember(next)
          return next
        })
        break
      }
      // Fold away anything that will not fit next time, before the reader asks again.
      await compact([...visible, { role: 'assistant', content: '' }], controller.signal)
    } catch (chatError) {
      if (!controller.signal.aborted) {
        console.warn('chat failed', chatError)
        setError(t.failed)
      }
    } finally {
      abort.current = null
      setBusy(false)
      setStreaming('')
    }
  }

  // A question typed into the bar at the bottom of another screen arrives
  // here. It must fire for the question itself and nothing else, so the
  // sender and the callback are deliberately left out of the dependencies;
  // `asked` makes sure the same question is never sent twice.
  useEffect(() => {
    if (!pending || pending === asked.current) return
    asked.current = pending
    onPendingConsumed?.()
    void send(pending)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending])

  const stop = () => {
    abort.current?.abort()
    if (streaming) setTurns((current) => [...current, { role: 'assistant', content: streaming }])
    setStreaming('')
    setBusy(false)
  }

  const startNew = () => {
    setTurns([])
    setStreaming('')
    setError('')
    conversationId.current = newConversationId()
    summary.current = ''
    summarised.current = 0
    setShown(VISIBLE_TURNS)
    setShowHistory(false)
  }

  return (
    <main className="screen chat-screen" data-testid="chat-screen">
      <header className="screen-heading chat-heading">
        <div>
          <span className="eyebrow">{t.eyebrow}</span>
          <h1>{t.title}</h1>
        </div>
        {ready && (
          <div className="chip-row">
            <button type="button" className="chip" onClick={startNew} data-testid="chat-new">
              <Plus size={16} /> {t.newChat}
            </button>
            <button type="button" className="chip" aria-pressed={showHistory} onClick={() => setShowHistory((open) => !open)} data-testid="chat-history">
              <History size={16} /> {t.history}
            </button>
          </div>
        )}
      </header>

      {!ready && <ModelPrompt copy={copy} language={language} onReady={() => setReady(true)} />}

      {ready && showHistory && (
        <section className="panel" data-testid="chat-history-list">
          {conversations.length === 0 ? (
            <p className="body">{t.historyEmpty}</p>
          ) : (
            <ul className="model-list">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => {
                      setTurns(conversation.turns as Turn[])
                      conversationId.current = conversation.id
                      summary.current = conversation.summary ?? ''
                      summarised.current = conversation.summarised ?? 0
                      setShown(VISIBLE_TURNS)
                      setShowHistory(false)
                    }}
                  >
                    {conversation.title}
                  </button>
                  <button type="button" className="ghost-button" aria-label={t.clear} onClick={() => setConversations(deleteConversation(conversation.id))}>
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {ready && (
        <section className="panel chat-log" data-testid="chat-log">
          {turns.length === 0 && !streaming && !busy && <p className="body">{t.opening}</p>}
          {turns.length > shown && (
            <button type="button" className="link-button" onClick={() => setShown((count) => count + VISIBLE_TURNS)} data-testid="chat-earlier">
              {t.earlier}
            </button>
          )}
          {turns.slice(Math.max(0, turns.length - shown)).map((turn, index) =>
            turn.role === 'tool' ? (
              <p key={index} className="chat-tool">
                <Wand2 size={14} /> {turn.content}
              </p>
            ) : (
              <p key={index} className={turn.role === 'user' ? 'chat-bubble mine' : 'chat-bubble'}>
                {renderInline(turn.content)}
              </p>
            ),
          )}
          {streaming && <p className="chat-bubble">{renderInline(streaming)}</p>}
          {busy && !streaming && <p className="chat-bubble thinking">{t.thinking}</p>}
          {error && <p className="status failed">{error}</p>}
        </section>
      )}

      {ready && (
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
            <button
              type="button"
              className="ghost-button chat-clear"
              onClick={startNew}
              disabled={turns.length === 0 || busy}
              aria-label={t.clear}
              data-testid="chat-clear"
            >
              <Trash2 size={16} />
              <span className="button-label">{t.clear}</span>
            </button>
            {busy ? (
              <button type="button" className="ghost-button chat-send" onClick={stop}>
                <Square size={16} /> {t.stop}
              </button>
            ) : (
              <button type="button" className="primary-button chat-send" onClick={() => void send()} disabled={!draft.trim()} data-testid="chat-send">
                <Send size={16} /> {t.send}
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  )
}

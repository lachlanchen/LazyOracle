import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowDown, History, RotateCcw, Plus, Send, Square, Trash2, Wand2 } from 'lucide-react'
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
  facts?: string
}

function persona(language: ReadingLanguage): string {
  if (language === 'en') {
    return [
      'You are Tianji, the reader inside LazyOracle. You work with tarot, BaZi (four pillars), the I Ching, astrology, feng shui, palmistry, face reading and the two books.',
      'English is the interface default. Naturally follow the language the reader uses or explicitly requests. Answer warmly and plainly, in at most 200 words unless more is asked for. An occasional useful traditional term is fine; explain it briefly and avoid repeated language switching or duplicate translations.',
      'Name the tradition you are reading from, and base every claim on facts you were given or that a tool returned.',
      'Treat all of this as a mirror for reflection rather than prediction, and say so only when it matters. No medical, legal or financial promises.',
    ].join(' ')
  }
  return [
    '你是「天机」，LazyOracle 中的解读者。你精通塔罗、四柱八字、周易、星座、风水、手相、面相与两本书。',
    '界面语言是简体中文，默认用中文；自然尊重用户所用的语言和明确的语言要求。语气温和直白，除非对方要求，否则不超过 300 字。必要时可以偶尔用一个外语术语并简单解释，不要频繁中英切换或重复双语翻译。',
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
  const retryState = useRef<{ working: ChatMessage[]; results: Map<string, ReturnType<typeof runTool>>; visible: Turn[] } | null>(null)
  const [canRetry, setCanRetry] = useState(false)
  useEffect(() => () => { abort.current?.abort(); abort.current = null }, [])
  const log = useRef<HTMLElement>(null)
  const followLatest = useRef(true)
  const earlierHeight = useRef<number | null>(null)
  const [awayFromBottom, setAwayFromBottom] = useState(false)
  const t = copy.chat

  const goToBottom = () => {
    followLatest.current = true
    if (log.current) log.current.scrollTop = log.current.scrollHeight
    setAwayFromBottom(false)
  }

  useLayoutEffect(() => {
    const element = log.current
    if (!element) return
    if (earlierHeight.current !== null) {
      element.scrollTop += element.scrollHeight - earlierHeight.current
      earlierHeight.current = null
    } else if (followLatest.current) {
      element.scrollTop = element.scrollHeight
    }
  }, [turns, streaming, busy, ready, shown, showHistory])

  // Keyboard/viewport changes should also keep the latest reply in view.
  useEffect(() => {
    if (!log.current || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (followLatest.current && log.current) log.current.scrollTop = log.current.scrollHeight
    })
    observer.observe(log.current)
    return () => observer.disconnect()
  }, [ready])

  /**
   * Streams one reply. A provider that supports function calling answers with
   * tool calls; a model on the phone writes them as a line of text instead.
   * Neither is shown to the reader.
   */
  const ask = async (messages: ChatMessage[], controller: AbortController, allowTools: boolean): Promise<{ text: string; calls: ToolCallRequest[] }> => {
    let latest = ''
    let calls: ToolCallRequest[] = []
    await generateChat(
      messages,
      (update) => {
        if (abort.current !== controller || controller.signal.aborted) return
        latest = update.text
        if (update.toolCalls?.length) calls = update.toolCalls
        setStreaming(update.text.trimStart().startsWith('<tool') ? '' : update.text)
      },
      controller.signal,
      allowTools ? toolSchemas(language) : [],
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
    const pending = all.slice(summarised.current).map(turn => ({ ...turn, content: turn.facts ?? turn.content }))
    const { older } = fitToBudget(pending, historyBudget())
    if (older.length < 2) return
    try {
      const result = await summariseTurns(summary.current, older, language, signal)
      if (!signal.aborted) { summary.current = result; summarised.current += older.length }
    } catch (error) {
      // A failed summary is not worth interrupting the reader for; the next
      // turn simply sends a little less history.
      console.warn('could not compact the conversation', error)
    }
  }

  /**
   * One exchange. The model may answer in words, or ask for one of the app's
   * engines; each tool call runs here on the device and its facts go back to
   * the model, up to `MAX_STEPS` times before it must answer.
   */
  const send = async (text?: string, retrying = false) => {
    const question = (text ?? draft).trim()
    if ((!question && !retrying) || busy) return
    const cached = retrying ? retryState.current : null
    if (retrying && !cached) return
    goToBottom()
    let visible: Turn[] = cached?.visible ?? [...turns, { role: 'user', content: question }]
    setTurns(visible)
    remember(visible)
    setDraft(''); setError(''); setBusy(true); setStreaming(''); setCanRetry(false)
    const controller = new AbortController()
    abort.current = controller
    let timedOut = false
    const deadline = setTimeout(() => { timedOut = true; controller.abort() }, 90_000)
    const attempted = cached?.results ?? new Map<string, ReturnType<typeof runTool>>()
    const pending = visible.slice(summarised.current)
      .filter(turn => turn.role !== 'tool' || turn.facts)
      .map(turn => ({ ...turn, content: turn.role === 'tool' ? `Historical engine result (reuse these facts): ${turn.facts}` : turn.content }))
    const { keep } = fitToBudget(pending, historyBudget())
    let working: ChatMessage[] = cached?.working ?? [
      { role: 'system', content: `${persona(language)}\n\n${toolInstructions(language)}\nReuse historical engine results for follow-up questions. Make a new draw or cast only when the reader asks for one. If a direction or question is ambiguous, ask a short clarification.` },
      ...(summary.current ? [{ role: 'system' as const, content: `Earlier conversation: ${summary.current}` }] : []),
      ...keep.map(turn => ({ role: turn.role === 'assistant' ? 'assistant' as const : 'user' as const, content: turn.content })),
    ]
    const retain = () => { retryState.current = { working, results: attempted, visible } }
    retain()
    let forceAnswer = false
    let quiet = 0
    try {
      for (let step = 0; step <= MAX_STEPS; step += 1) {
        const last = step >= MAX_STEPS || forceAnswer
        if (last) working = [...working, { role: 'user', content: 'Answer now using the computed facts above. Do not call any more tools; explain any limitation briefly.' }]
        const { text: reply, calls } = await ask(working, controller, !last)
        controller.signal.throwIfAborted()
        const written = parseToolCall(reply)
        if (calls.length || written) {
          if (last) throw new Error('The reader did not return an explanation')
          const requested = calls.length ? calls : [{ id: 'written', name: written!.name, arguments: JSON.stringify(written!.arguments) }]
          working = [...working, calls.length
            ? { role: 'assistant', content: reply || null, tool_calls: calls.map(call => ({ id: call.id, type: 'function', function: { name: call.name, arguments: call.arguments } })) }
            : { role: 'assistant', content: reply }]
          for (const call of requested) {
            let args: Record<string, unknown> = {}
            try { args = JSON.parse(call.arguments || '{}') } catch { /* engine reports invalid input */ }
            const signature = `${call.name}:${JSON.stringify(args, Object.keys(args).sort())}`
            let result = attempted.get(signature)
            if (result) forceAnswer = true
            else {
              result = runTool({ name: call.name, arguments: args }, language)
              attempted.set(signature, result)
              visible = [...visible, { role: 'tool', content: result.label, facts: result.output }]
              setTurns(visible); remember(visible)
            }
            working = [...working, calls.length
              ? { role: 'tool', content: result.output, tool_call_id: call.id, name: call.name }
              : { role: 'user', content: toolResultMessage(result) }]
          }
          retain(); setStreaming(''); continue
        }
        if (!reply.trim()) {
          if (quiet++ === 0 && !last) { forceAnswer = true; continue }
          throw new Error('Empty reading')
        }
        visible = [...visible, { role: 'assistant', content: reply }]
        setTurns(visible); remember(visible)
        retryState.current = null
        await compact(visible, controller.signal)
        if (!controller.signal.aborted) remember(visible)
        break
      }
    } catch (chatError) {
      if (abort.current === controller) {
        if (!controller.signal.aborted || timedOut) {
          console.warn('chat failed', chatError)
          setError(t.failed)
        }
        setCanRetry(true)
      }
    } finally {
      clearTimeout(deadline)
      if (abort.current === controller) {
        abort.current = null; setBusy(false); setStreaming('')
      }
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
    abort.current = null
    setStreaming(''); setBusy(false); setCanRetry(Boolean(retryState.current))
  }

  const startNew = () => {
    stop(); retryState.current = null; setCanRetry(false)
    goToBottom()
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

      {!ready && <ModelPrompt copy={copy} onReady={() => setReady(true)} />}

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
                      stop(); retryState.current = null; setCanRetry(false); setError('')
                      goToBottom()
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
        <section ref={log} className="panel chat-log" data-testid="chat-log" onScroll={() => {
          const element = log.current
          if (!element) return
          const away = element.scrollHeight - element.scrollTop - element.clientHeight > 48
          followLatest.current = !away
          setAwayFromBottom(away)
        }}>
          {turns.length === 0 && !streaming && !busy && <p className="body">{t.opening}</p>}
          {turns.length > shown && (
            <button type="button" className="link-button" onClick={() => {
              earlierHeight.current = log.current?.scrollHeight ?? null
              followLatest.current = false
              setShown((count) => count + VISIBLE_TURNS)
            }} data-testid="chat-earlier">
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
          {awayFromBottom && <button type="button" className="chip chat-latest" onClick={goToBottom} data-testid="chat-latest"><ArrowDown size={16} /> {t.latest}</button>}
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
            {canRetry && !busy && <button type="button" className="chip" data-testid="chat-retry" onClick={() => void send(undefined, true)}><RotateCcw size={16} /> {language === 'en' ? 'Retry' : '重试'}</button>}
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

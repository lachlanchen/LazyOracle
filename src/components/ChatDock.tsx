import { useState } from 'react'
import { Send } from 'lucide-react'
import type { UICopy } from '../i18n'

interface ChatDockProps {
  copy: UICopy
  /** Opens the chat with this question. */
  onAsk: (question: string) => void
}

/**
 * The bar that sits at the bottom of every screen. Typing a question and
 * pressing enter opens the chat with it, so a reading can be talked through
 * without hunting for the right screen first.
 */
export function ChatDock({ copy, onAsk }: ChatDockProps) {
  const [draft, setDraft] = useState('')
  const submit = () => {
    const question = draft.trim()
    if (!question) return
    setDraft('')
    onAsk(question)
  }

  return (
    <form
      className="chat-dock"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <input
        type="text"
        value={draft}
        placeholder={copy.chat.dockPlaceholder}
        aria-label={copy.chat.dockPlaceholder}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => undefined}
        data-testid="dock-input"
      />
      <button type="submit" className="icon-button" aria-label={copy.chat.send} disabled={!draft.trim()} data-testid="dock-send">
        <Send size={18} />
      </button>
    </form>
  )
}

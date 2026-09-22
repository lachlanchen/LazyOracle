/**
 * Saved conversations for "问天机 / Ask Tianji".
 *
 * Conversations stay on the device, in local storage, like everything else in
 * this app. The newest `MAX_CONVERSATIONS` are kept; older ones drop off.
 */

export interface StoredTurn {
  role: 'user' | 'assistant' | 'tool'
  content: string
}

export interface Conversation {
  id: string
  /** First thing the reader asked, trimmed; used as the title in the list. */
  title: string
  turns: StoredTurn[]
  /** Milliseconds since the epoch, for ordering the list. */
  updatedAt: number
  /**
   * A short account of the turns that no longer fit in the model's context,
   * written by the model itself. The conversation keeps growing on screen;
   * only what is sent is compacted.
   */
  summary?: string
  /** How many leading turns the summary already covers. */
  summarised?: number
}

const KEY = 'lazyoracle.chats'
export const MAX_CONVERSATIONS = 20

export function newConversationId(): string {
  return `c${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`
}

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return (parsed as Conversation[])
      .filter((item) => item && typeof item.id === 'string' && Array.isArray(item.turns))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

/** Inserts or replaces one conversation and returns the new list. */
export function saveConversation(conversation: Conversation): Conversation[] {
  const rest = loadConversations().filter((item) => item.id !== conversation.id)
  const next = [conversation, ...rest].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CONVERSATIONS)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage may be full or blocked; the conversation then lasts for the session.
  }
  return next
}

export function deleteConversation(id: string): Conversation[] {
  const next = loadConversations().filter((item) => item.id !== id)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
  return next
}

export function conversationTitle(turns: StoredTurn[]): string {
  const first = turns.find((turn) => turn.role === 'user')?.content ?? ''
  const oneLine = first.replace(/\s+/g, ' ').trim()
  return oneLine.length > 40 ? `${oneLine.slice(0, 40)}…` : oneLine || '…'
}

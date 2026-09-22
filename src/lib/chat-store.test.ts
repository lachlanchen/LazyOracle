import { beforeEach, describe, expect, it } from 'vitest'
import { conversationTitle, deleteConversation, loadConversations, MAX_CONVERSATIONS, newConversationId, saveConversation } from './chat-store'

describe('saved conversations', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns nothing before anything is saved', () => {
    expect(loadConversations()).toEqual([])
  })

  it('keeps the newest first, so the chat reopens where the reader left off', () => {
    saveConversation({ id: 'a', title: 'older', turns: [{ role: 'user', content: 'one' }], updatedAt: 1000 })
    saveConversation({ id: 'b', title: 'newer', turns: [{ role: 'user', content: 'two' }], updatedAt: 2000 })
    expect(loadConversations().map((c) => c.id)).toEqual(['b', 'a'])
  })

  it('replaces a conversation rather than duplicating it as it grows', () => {
    const id = newConversationId()
    saveConversation({ id, title: 'first', turns: [{ role: 'user', content: 'one' }], updatedAt: 1 })
    saveConversation({ id, title: 'first', turns: [{ role: 'user', content: 'one' }, { role: 'assistant', content: 'two' }], updatedAt: 2 })
    const saved = loadConversations()
    expect(saved).toHaveLength(1)
    expect(saved[0].turns).toHaveLength(2)
  })

  it('forgets the oldest once there are too many', () => {
    for (let index = 0; index < MAX_CONVERSATIONS + 5; index += 1) {
      saveConversation({ id: `c${index}`, title: String(index), turns: [{ role: 'user', content: String(index) }], updatedAt: index })
    }
    const saved = loadConversations()
    expect(saved).toHaveLength(MAX_CONVERSATIONS)
    expect(saved[saved.length - 1].id).toBe('c5')
  })

  it('deletes one and leaves the rest', () => {
    saveConversation({ id: 'a', title: 'a', turns: [], updatedAt: 1 })
    saveConversation({ id: 'b', title: 'b', turns: [], updatedAt: 2 })
    expect(deleteConversation('a').map((c) => c.id)).toEqual(['b'])
  })

  it('titles a conversation from its first question, shortened', () => {
    expect(conversationTitle([{ role: 'user', content: '  Should I   take the offer?\n' }])).toBe('Should I take the offer?')
    expect(conversationTitle([{ role: 'user', content: 'x'.repeat(60) }])).toHaveLength(41)
    expect(conversationTitle([])).toBe('…')
  })
})

import { beforeEach, expect, it } from 'vitest'
import { importNativeArchive } from './native-archive'

beforeEach(() => localStorage.clear())
it('imports native profile, language, dates and exact engine facts once', () => {
  const archive = { platform: 'ios', profile: JSON.stringify({ name: 'Fixture', place: 'Hong Kong' }), language: 'zh-Hant',
    chats: JSON.stringify([{ id: 'one', title: 'Reading', updated: 800000000, turns: [
      { kind: 'reader', text: 'What about west?' }, { kind: 'tool', text: 'Cast', facts: '{"seed":42}' }, { kind: 'oracle', text: 'Answer' },
    ] }]) }
  importNativeArchive(archive)
  expect(JSON.parse(localStorage.getItem('lazyoracle.profile')!).name).toBe('Fixture')
  expect(localStorage.getItem('lazyoracle.language')).toBe('zh-Hans')
  const chats = JSON.parse(localStorage.getItem('lazyoracle.chats')!)
  expect(chats[0].updatedAt).toBe(1778307200000)
  expect(chats[0].turns[1]).toEqual({ role: 'tool', content: 'Cast', facts: '{"seed":42}' })
  expect(JSON.parse(localStorage.getItem('lazyoracle.native-import.backup')!)).toEqual(archive)
  importNativeArchive(archive)
  expect(JSON.parse(localStorage.getItem('lazyoracle.chats')!)).toHaveLength(1)
})
it('retains web data and merges Android timestamps without duplicating conversations', () => {
  localStorage.setItem('lazyoracle.profile', '{"name":"Existing"}')
  localStorage.setItem('lazyoracle.language', 'en')
  localStorage.setItem('lazyoracle.chats', '[{"id":"web","updatedAt":1,"turns":[]}]')
  importNativeArchive({ platform: 'android', profile: '{"name":"Older"}', language: 'zh-Hans', chats: '[{"id":"a","title":"Saved","updated":12345,"turns":[]}]' })
  expect(localStorage.getItem('lazyoracle.profile')).toBe('{"name":"Existing"}')
  expect(localStorage.getItem('lazyoracle.language')).toBe('en')
  expect(JSON.parse(localStorage.getItem('lazyoracle.chats')!).map((c: { id: string; updatedAt: number }) => [c.id, c.updatedAt])).toEqual([['native-a', 12345], ['web', 1]])
})

import { Capacitor, registerPlugin } from '@capacitor/core'
import { DEFAULT_PROFILE } from './profile'
import type { Conversation, StoredTurn } from './chat-store'

export interface NativeArchive { profile?: string; language?: string; chats?: string; platform?: string }
interface NativeTurn { kind: string; text: string; facts?: string }
interface NativeConversation { id: string; title: string; turns: NativeTurn[]; updated?: number; summary?: string }
const MARKER = 'lazyoracle.native-import.v1'

/** Merge once, without deleting or modifying either original native store. */
export function importNativeArchive(archive: NativeArchive, storage: Storage = localStorage): void {
  if (storage.getItem(MARKER)) return
  const profile = archive.profile ? { ...DEFAULT_PROFILE, ...JSON.parse(archive.profile) } : null
  const chats = archive.chats ? JSON.parse(archive.chats) as NativeConversation[] : []
  if (!Array.isArray(chats)) throw new Error('Invalid native chat archive')
  const existing = JSON.parse(storage.getItem('lazyoracle.chats') ?? '[]') as Conversation[]
  if (!Array.isArray(existing)) throw new Error('Invalid existing chat archive')
  const imported: Conversation[] = chats.filter(c => typeof c.id === 'string' && Array.isArray(c.turns)).map(c => ({
    id: `native-${c.id}`, title: c.title,
    updatedAt: typeof c.updated === 'number' ? (archive.platform === 'ios' ? (c.updated + 978307200) * 1000 : c.updated) : 0,
    turns: c.turns.filter(t => typeof t.text === 'string').map((t): StoredTurn => ({
      role: t.kind === 'reader' ? 'user' : t.kind === 'tool' ? 'tool' : 'assistant',
      content: t.text, ...(t.facts ? { facts: t.facts } : {}),
    })),
    // The complete transcript is retained; let the web client summarize it again
    // when needed, instead of importing a summary with an unknown coverage index.
  }))
  storage.setItem('lazyoracle.native-import.backup', JSON.stringify(archive))
  if (profile && !storage.getItem('lazyoracle.profile')) storage.setItem('lazyoracle.profile', JSON.stringify(profile))
  if (archive.language && !storage.getItem('lazyoracle.language')) {
    // The classic interface offers English and Chinese. Retain the exact native
    // preference in the backup, and use its closest supported classic language.
    storage.setItem('lazyoracle.language', archive.language.startsWith('zh') ? 'zh-Hans' : 'en')
  }
  const ids = new Set(existing.map(c => c.id))
  storage.setItem('lazyoracle.chats', JSON.stringify([...existing, ...imported.filter(c => !ids.has(c.id))].sort((a, b) => b.updatedAt - a.updatedAt)))
  storage.setItem(MARKER, 'done')
}

export async function restoreNativeArchive(): Promise<void> {
  if (import.meta.env.VITE_APP_IDENTITY !== 'auspice' || !Capacitor.isNativePlatform()) return
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    if (localStorage.getItem(MARKER)) return
    const plugin = registerPlugin<{ read(): Promise<NativeArchive> }>('NativeArchive')
    const archive = await Promise.race([
      plugin.read(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Archive read timed out')), 3000) }),
    ])
    importNativeArchive(archive)
  } catch {
    // Original native storage is safe; retry on the next launch.
    console.warn('Saved native data could not be imported yet; it remains on this device.')
  } finally { clearTimeout(timer) }
}

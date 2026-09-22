import { describe, expect, it } from 'vitest'
import { systemPrompt } from './reading'
import { astrologySystemPrompt, baziSystemPrompt, bookSystemPrompt, faceSystemPrompt, fengshuiSystemPrompt, ichingSystemPrompt, palmSystemPrompt } from './contexts'
import { methodNote } from './references'

describe('method notes', () => {
  it('gives every practice an ordered method and names its source', () => {
    for (const practice of ['tarot', 'bazi', 'iching', 'astrology', 'fengshui', 'palm', 'face', 'answers'] as const) {
      for (const language of ['en', 'zh-Hans'] as const) {
        const note = methodNote(practice, language)
        expect(note.length).toBeGreaterThanOrEqual(4)
        expect(note[0]).toMatch(language === 'en' ? /Method/ : /读法/)
        expect(note[note.length - 1]).toMatch(language === 'en' ? /Method source:/ : /方法依据：/)
      }
    }
  })

  it('reaches every prompt, so no reading is written without its method', () => {
    const prompts = [systemPrompt, baziSystemPrompt, ichingSystemPrompt, astrologySystemPrompt, fengshuiSystemPrompt, palmSystemPrompt, faceSystemPrompt, bookSystemPrompt]
    for (const build of prompts) {
      for (const language of ['en', 'zh-Hans'] as const) {
        const text = build(language)
        expect(text).toMatch(language === 'en' ? /Method source:/ : /方法依据：/)
      }
    }
  })

  it('tells the four pillars reader to judge the day master before naming a useful god', () => {
    const note = methodNote('bazi', 'en').join(' ')
    expect(note.indexOf('day master')).toBeLessThan(note.indexOf('useful god'))
  })

  it('keeps face reading away from appearance and health', () => {
    const note = methodNote('face', 'en').join(' ')
    expect(note).toMatch(/Never comment on attractiveness, race, health or intelligence/)
  })
})

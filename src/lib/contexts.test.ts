import { expect, it } from 'vitest'
import { castHexagram } from '../engines/iching/cast'
import { ichingContext, ichingSystemPrompt } from './contexts'

it('tells the narrator the exact still lines selected by a four-change cast', () => {
  const cast = castHexagram({ seed: 25 })
  const context = ichingContext(cast, 'en')
  expect(cast.changingPositions).toEqual([1, 3, 4, 6])
  expect(context.readingFocus).toMatchObject({ from: 'resulting', positions: [2, 5] })
  expect(context.seed).toBe(25)
  expect(context.resulting?.judgement).toBe(cast.resulting?.judgement)
  expect(context.lineVersesAvailable).toBe(false)
  expect(ichingSystemPrompt('en')).toContain('Never infer still lines from yin/yang')
})

it('retains the primary focus and original question in a Chinese explanation', () => {
  const cast = castHexagram({ seed: 42, question: '怎样准备这次谈话？' })
  const context = ichingContext(cast, 'zh-Hans')
  expect(context.question).toBe(cast.question)
  expect(context.readingFocus).toMatchObject({ from: 'primary', positions: [6], rule: cast.focus.rule.zh })
  expect(context.primary.number).toBe(cast.primary.number)
  expect(context.resulting?.number).toBe(cast.resulting?.number)
})

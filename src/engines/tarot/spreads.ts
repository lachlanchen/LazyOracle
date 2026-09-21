import type { Spread } from './types'

export const SPREADS: Record<Spread['id'], Spread> = {
  one: {
    id: 'one',
    name: { en: 'One card', zh: '单张牌' },
    positions: [
      {
        id: 'focus',
        name: { en: 'The heart of the matter', zh: '问题核心' },
        question: { en: 'What most needs to be seen about this question right now?', zh: '此刻最需要看见的是什么？' },
        layout: { x: 0.5, y: 0.5 },
      },
    ],
  },
  three: {
    id: 'three',
    name: { en: 'Past · Present · Future', zh: '过去 · 现在 · 未来' },
    positions: [
      { id: 'past', name: { en: 'Past', zh: '过去' }, question: { en: 'What has shaped the situation?', zh: '是什么塑造了现状？' }, layout: { x: 0.2, y: 0.5 } },
      { id: 'present', name: { en: 'Present', zh: '现在' }, question: { en: 'Where do things stand now?', zh: '现在处于什么状态？' }, layout: { x: 0.5, y: 0.5 } },
      { id: 'future', name: { en: 'Future', zh: '未来' }, question: { en: 'Where is this heading if nothing changes?', zh: '如果不作改变，会走向哪里？' }, layout: { x: 0.8, y: 0.5 } },
    ],
  },
  celtic: {
    id: 'celtic',
    name: { en: 'Celtic Cross', zh: '凯尔特十字' },
    positions: [
      { id: 'present', name: { en: 'Present', zh: '现状' }, question: { en: 'The situation as it is.', zh: '当下的处境。' }, layout: { x: 0.32, y: 0.5 } },
      { id: 'challenge', name: { en: 'Challenge', zh: '挑战' }, question: { en: 'What crosses or tests it.', zh: '横亘其中的阻力或考验。' }, layout: { x: 0.32, y: 0.5, rotate: true } },
      { id: 'foundation', name: { en: 'Foundation', zh: '根基' }, question: { en: 'The root beneath the situation.', zh: '处境之下的根源。' }, layout: { x: 0.32, y: 0.84 } },
      { id: 'past', name: { en: 'Recent past', zh: '过去' }, question: { en: 'What is passing away.', zh: '正在逝去的影响。' }, layout: { x: 0.1, y: 0.5 } },
      { id: 'crown', name: { en: 'Best outcome', zh: '可能' }, question: { en: 'What could come of it at best.', zh: '最好的可能结果。' }, layout: { x: 0.32, y: 0.16 } },
      { id: 'near', name: { en: 'Near future', zh: '近期' }, question: { en: 'What is approaching.', zh: '即将到来的。' }, layout: { x: 0.54, y: 0.5 } },
      { id: 'self', name: { en: 'You', zh: '自身' }, question: { en: 'Your attitude in this.', zh: '你在其中的态度。' }, layout: { x: 0.85, y: 0.88 } },
      { id: 'environment', name: { en: 'Around you', zh: '环境' }, question: { en: 'People and forces around you.', zh: '周围的人与力量。' }, layout: { x: 0.85, y: 0.63 } },
      { id: 'hopes', name: { en: 'Hopes and fears', zh: '希望与恐惧' }, question: { en: 'What you hope for or dread.', zh: '你所期待或畏惧的。' }, layout: { x: 0.85, y: 0.38 } },
      { id: 'outcome', name: { en: 'Outcome', zh: '结果' }, question: { en: 'Where it is likely to lead.', zh: '可能的走向。' }, layout: { x: 0.85, y: 0.13 } },
    ],
  },
}

export const SPREAD_ORDER: Spread['id'][] = ['one', 'three', 'celtic']

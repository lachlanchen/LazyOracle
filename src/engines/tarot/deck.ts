import type { Rank, Suit, TarotCard } from './types'

// Meanings follow the Rider–Waite–Smith tradition (Waite, *The Pictorial Key to
// the Tarot*, 1910, public domain) condensed to keywords. Chinese names use the
// customary translations found in Chinese-language tarot literature.

type MajorRow = [number, string, string, string, string, string, string, TarotCard['element']]
// number, en name, en upright, en reversed, zh name, zh upright, zh reversed, element
const MAJORS: MajorRow[] = [
  [0, 'The Fool', 'beginnings, innocence, a leap of faith', 'recklessness, hesitation, naivety', '愚者', '开始、纯真、放手一搏', '鲁莽、犹豫、天真', 'air'],
  [1, 'The Magician', 'skill, will, resources at hand', 'manipulation, scattered energy, untapped talent', '魔术师', '才能、意志、资源在手', '操纵、精力分散、才华未用', 'air'],
  [2, 'The High Priestess', 'intuition, mystery, the inner voice', 'secrets kept, ignored intuition, surface reading', '女祭司', '直觉、神秘、内在声音', '隐瞒、忽视直觉、只看表面', 'water'],
  [3, 'The Empress', 'abundance, nurture, creativity', 'dependence, creative block, smothering', '皇后', '丰盛、滋养、创造力', '依赖、创意受阻、过度保护', 'earth'],
  [4, 'The Emperor', 'structure, authority, stability', 'rigidity, domination, loss of control', '皇帝', '结构、权威、稳定', '僵硬、专制、失控', 'fire'],
  [5, 'The Hierophant', 'tradition, guidance, shared belief', 'dogma, rebellion, questioning convention', '教皇', '传统、指引、共同信念', '教条、反叛、质疑常规', 'earth'],
  [6, 'The Lovers', 'union, values, a heartfelt choice', 'disharmony, misaligned values, avoidance', '恋人', '结合、价值观、真心的选择', '不和、价值分歧、回避选择', 'air'],
  [7, 'The Chariot', 'determination, momentum, victory through focus', 'lack of direction, aggression, stalling', '战车', '决心、动能、专注取胜', '失去方向、冲动、停滞', 'water'],
  [8, 'Strength', 'courage, patience, gentle power', 'self-doubt, raw emotion, weakness', '力量', '勇气、耐心、温柔的力量', '自我怀疑、情绪失控、软弱', 'fire'],
  [9, 'The Hermit', 'reflection, solitude, inner search', 'isolation, loneliness, withdrawal', '隐士', '反思、独处、内在探寻', '孤立、孤独、退缩', 'earth'],
  [10, 'Wheel of Fortune', 'turning points, cycles, luck', 'resistance to change, setbacks, bad timing', '命运之轮', '转折、周期、运气', '抗拒改变、挫折、时机不对', 'fire'],
  [11, 'Justice', 'fairness, truth, cause and effect', 'unfairness, dishonesty, avoiding accountability', '正义', '公正、真相、因果', '不公、不诚实、逃避责任', 'air'],
  [12, 'The Hanged Man', 'pause, surrender, a new perspective', 'stalling, resistance, needless sacrifice', '倒吊人', '暂停、放下、换个角度', '拖延、抗拒、无谓牺牲', 'water'],
  [13, 'Death', 'endings, transformation, release', 'clinging, fear of change, stagnation', '死神', '结束、蜕变、释放', '执着、害怕改变、停滞', 'water'],
  [14, 'Temperance', 'balance, moderation, patience', 'excess, imbalance, impatience', '节制', '平衡、适度、耐心', '过度、失衡、急躁', 'fire'],
  [15, 'The Devil', 'attachment, temptation, feeling bound', 'release, reclaiming power, breaking a habit', '恶魔', '执念、诱惑、受束缚', '解脱、夺回主导、戒除习惯', 'earth'],
  [16, 'The Tower', 'sudden upheaval, revelation, collapse', 'averted disaster, fear of change, slow collapse', '高塔', '突变、揭示、崩塌', '避开灾难、害怕改变、缓慢瓦解', 'fire'],
  [17, 'The Star', 'hope, renewal, calm inspiration', 'discouragement, lost faith, disconnection', '星星', '希望、更新、平静的灵感', '气馁、失去信心、疏离', 'air'],
  [18, 'The Moon', 'illusion, intuition, the unconscious', 'clarity returning, fear released, confusion', '月亮', '幻象、直觉、潜意识', '恢复清明、释放恐惧、混乱', 'water'],
  [19, 'The Sun', 'joy, success, vitality', 'temporary gloom, overconfidence, delayed joy', '太阳', '喜悦、成功、活力', '暂时低落、过度自信、喜悦延后', 'fire'],
  [20, 'Judgement', 'awakening, reckoning, a calling', 'self-doubt, harsh judgement, ignoring the call', '审判', '觉醒、清算、召唤', '自我怀疑、苛责、忽视召唤', 'fire'],
  [21, 'The World', 'completion, wholeness, travel', 'incompleteness, delays, seeking closure', '世界', '完成、圆满、远行', '未完成、延迟、寻求了结', 'earth'],
]

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI']

const SUIT_TEXT: Record<Suit, { en: string; zh: string; element: TarotCard['element'] }> = {
  wands: { en: 'Wands', zh: '权杖', element: 'fire' },
  cups: { en: 'Cups', zh: '圣杯', element: 'water' },
  swords: { en: 'Swords', zh: '宝剑', element: 'air' },
  pentacles: { en: 'Pentacles', zh: '星币', element: 'earth' },
}

const RANK_TEXT: Record<string, { en: string; zh: string; label: string }> = {
  ace: { en: 'Ace', zh: '首牌', label: 'A' },
  2: { en: 'Two', zh: '二', label: '2' },
  3: { en: 'Three', zh: '三', label: '3' },
  4: { en: 'Four', zh: '四', label: '4' },
  5: { en: 'Five', zh: '五', label: '5' },
  6: { en: 'Six', zh: '六', label: '6' },
  7: { en: 'Seven', zh: '七', label: '7' },
  8: { en: 'Eight', zh: '八', label: '8' },
  9: { en: 'Nine', zh: '九', label: '9' },
  10: { en: 'Ten', zh: '十', label: '10' },
  page: { en: 'Page', zh: '侍从', label: 'P' },
  knight: { en: 'Knight', zh: '骑士', label: 'Kn' },
  queen: { en: 'Queen', zh: '王后', label: 'Q' },
  king: { en: 'King', zh: '国王', label: 'K' },
}

type MinorRow = [Rank, string, string, string, string]
// rank, en upright, en reversed, zh upright, zh reversed
const MINORS: Record<Suit, MinorRow[]> = {
  wands: [
    ['ace', 'inspiration, a spark, new venture', 'false start, delay, lack of passion', '灵感、火花、新计划', '假开始、拖延、缺乏热情'],
    [2, 'planning, a decision about the future', 'fear of the unknown, poor planning', '规划、面向未来的决定', '害怕未知、计划不周'],
    [3, 'expansion, foresight, waiting for ships', 'obstacles, delays, narrow vision', '扩展、远见、等待成果', '阻碍、延迟、目光短浅'],
    [4, 'celebration, home, harmony', 'instability, transition, lack of support', '庆祝、家园、和谐', '不稳定、过渡、缺乏支持'],
    [5, 'competition, conflict, differing views', 'conflict avoided, agreement, tension released', '竞争、冲突、意见分歧', '避免冲突、达成一致、紧张缓解'],
    [6, 'victory, recognition, public reward', 'ego, fall from grace, lack of recognition', '胜利、认可、公开奖赏', '自负、失势、不被认可'],
    [7, 'defending a position, perseverance', 'giving up, feeling overwhelmed', '守住立场、坚持', '放弃、不堪重负'],
    [8, 'swift movement, news, alignment', 'delays, frustration, scattered effort', '迅速推进、消息、顺畅', '延迟、挫败、精力分散'],
    [9, 'resilience, last stand, boundaries', 'exhaustion, paranoia, giving in', '韧性、最后坚守、界限', '疲惫、多疑、退让'],
    [10, 'burden, responsibility, hard work', 'letting go, delegation, release', '重担、责任、辛劳', '放下、委托、释放'],
    ['page', 'enthusiasm, exploration, a message', 'lack of direction, procrastination', '热情、探索、消息', '缺乏方向、拖延'],
    ['knight', 'action, adventure, impulsiveness', 'haste, scattered energy, frustration', '行动、冒险、冲动', '急躁、精力分散、挫败'],
    ['queen', 'confidence, warmth, determination', 'jealousy, insecurity, demanding', '自信、热情、坚定', '嫉妒、不安全感、苛求'],
    ['king', 'vision, leadership, boldness', 'impulsiveness, ruthlessness, high expectations', '远见、领导、果敢', '冲动、无情、期望过高'],
  ],
  cups: [
    ['ace', 'new feelings, compassion, openness', 'emotional loss, blocked feelings', '新的感情、慈悲、敞开', '情感失落、感受受阻'],
    [2, 'partnership, mutual attraction, unity', 'imbalance, broken communication', '伙伴关系、相互吸引、结合', '失衡、沟通破裂'],
    [3, 'friendship, celebration, community', 'overindulgence, gossip, isolation', '友谊、庆祝、群体', '放纵、闲话、孤立'],
    [4, 'apathy, contemplation, missed offers', 'renewed motivation, acceptance', '冷淡、沉思、错过机会', '重获动力、接受'],
    [5, 'loss, regret, focusing on what is gone', 'acceptance, moving on, forgiveness', '失去、遗憾、盯着失去的', '接受、向前走、原谅'],
    [6, 'nostalgia, childhood, innocence', 'living in the past, unrealistic ideals', '怀旧、童年、纯真', '沉溺过去、不切实际'],
    [7, 'choices, illusions, wishful thinking', 'clarity, a decision made, disillusion', '选择、幻象、一厢情愿', '清醒、做出决定、幻灭'],
    [8, 'walking away, seeking deeper meaning', 'aimless drifting, fear of moving on', '离开、寻找更深意义', '漫无目的、害怕离开'],
    [9, 'contentment, satisfaction, a wish fulfilled', 'smugness, dissatisfaction, materialism', '满足、如愿、心想事成', '自满、不满、物质化'],
    [10, 'harmony, family joy, lasting happiness', 'broken home, misaligned values', '和谐、家庭喜悦、持久幸福', '家庭破裂、价值不合'],
    ['page', 'creative openings, intuition, a tender message', 'emotional immaturity, creative block', '创意开端、直觉、温柔的消息', '情感幼稚、创意受阻'],
    ['knight', 'romance, charm, following the heart', 'moodiness, unrealistic promises', '浪漫、魅力、跟随内心', '情绪化、不切实际的承诺'],
    ['queen', 'compassion, calm, emotional depth', 'insecurity, dependence, martyrdom', '慈悲、平静、情感深度', '不安全感、依赖、自我牺牲'],
    ['king', 'emotional balance, diplomacy, wisdom', 'manipulation, moodiness, coldness', '情绪平衡、圆融、智慧', '操控、情绪化、冷漠'],
  ],
  swords: [
    ['ace', 'clarity, breakthrough, truth', 'confusion, misinformation, a clouded mind', '清晰、突破、真相', '困惑、误导、思绪混乱'],
    [2, 'stalemate, a difficult choice, denial', 'information revealed, indecision ending', '僵局、艰难选择、否认', '真相揭示、结束犹豫'],
    [3, 'heartbreak, grief, painful truth', 'recovery, forgiveness, releasing pain', '心碎、悲伤、痛苦的真相', '恢复、原谅、释放痛苦'],
    [4, 'rest, recovery, contemplation', 'restlessness, burnout, stagnation', '休息、恢复、沉思', '不安、倦怠、停滞'],
    [5, 'conflict, winning at a cost, tension', 'reconciliation, making amends', '冲突、代价高昂的胜利、紧张', '和解、弥补'],
    [6, 'transition, moving on, calmer waters', 'resistance to change, unfinished business', '过渡、离开、驶向平静', '抗拒改变、未了之事'],
    [7, 'strategy, deception, acting alone', 'coming clean, conscience, getting caught', '策略、欺瞒、独自行动', '坦白、良心、败露'],
    [8, 'feeling trapped, self-imposed limits', 'release, new perspective, freedom', '受困、自设限制', '解脱、新视角、自由'],
    [9, 'anxiety, worry, sleepless nights', 'hope, releasing fear, seeking help', '焦虑、忧虑、失眠', '希望、放下恐惧、寻求帮助'],
    [10, 'painful ending, rock bottom, betrayal', 'recovery, survival, the worst is over', '痛苦的结束、谷底、背叛', '恢复、幸存、最坏已过'],
    ['page', 'curiosity, vigilance, new ideas', 'gossip, haste, all talk', '好奇、警觉、新想法', '闲话、急躁、光说不做'],
    ['knight', 'ambition, fast action, directness', 'recklessness, aggression, burnout', '雄心、迅速行动、直接', '鲁莽、攻击性、倦怠'],
    ['queen', 'clear thinking, independence, candour', 'coldness, bitterness, harsh words', '清晰思考、独立、坦率', '冷漠、怨愤、言辞尖刻'],
    ['king', 'authority, intellect, truth', 'manipulation, tyranny, abuse of power', '权威、理智、真相', '操控、专横、滥用权力'],
  ],
  pentacles: [
    ['ace', 'opportunity, prosperity, a seed planted', 'missed chance, poor planning, greed', '机会、富足、播下种子', '错失机会、计划不周、贪婪'],
    [2, 'balance, juggling priorities, adaptability', 'overwhelm, disorganisation', '平衡、兼顾多事、适应', '不堪重负、混乱'],
    [3, 'teamwork, craftsmanship, learning', 'lack of teamwork, sloppy work', '团队合作、手艺、学习', '缺乏协作、粗糙'],
    [4, 'security, saving, holding on', 'greed, over-control, letting go of money', '安全、储蓄、守住', '贪婪、过度控制、放开财务'],
    [5, 'hardship, insecurity, feeling left out', 'recovery, spiritual comfort, help arriving', '困难、不安、被排除', '恢复、精神慰藉、援助到来'],
    [6, 'generosity, charity, giving and receiving', 'debt, strings attached, one-sided giving', '慷慨、施予、有来有往', '债务、附带条件、单方付出'],
    [7, 'patience, investment, long-term view', 'impatience, wasted effort, poor returns', '耐心、投入、长远眼光', '急躁、徒劳、回报不佳'],
    [8, 'diligence, skill-building, apprenticeship', 'perfectionism, uninspired work', '勤奋、磨练技艺、学徒', '完美主义、缺乏热情的工作'],
    [9, 'independence, luxury, self-sufficiency', 'over-work, superficiality, financial setback', '独立、富裕、自给自足', '过劳、浮华、财务挫折'],
    [10, 'legacy, family wealth, long-term success', 'family disputes, instability, loss', '传承、家族财富、长期成功', '家庭纷争、不稳定、损失'],
    ['page', 'ambition, study, a practical opportunity', 'lack of progress, procrastination', '抱负、学习、务实的机会', '缺乏进展、拖延'],
    ['knight', 'hard work, routine, reliability', 'boredom, stagnation, feeling stuck', '勤勉、规律、可靠', '乏味、停滞、被困'],
    ['queen', 'nurturing, practicality, a warm home', 'self-neglect, work-life imbalance', '滋养、务实、温暖的家', '忽视自己、工作生活失衡'],
    ['king', 'wealth, discipline, mastery', 'greed, stubbornness, materialism', '财富、纪律、精通', '贪婪、固执、物质主义'],
  ],
}

function keywords(text: string): string[] {
  return text.split(/,\s*|、/).map((item) => item.trim()).filter(Boolean)
}

function buildDeck(): TarotCard[] {
  const majors: TarotCard[] = MAJORS.map(([number, en, enUp, enRev, zh, zhUp, zhRev, element]) => ({
    id: `major-${String(number).padStart(2, '0')}`,
    arcana: 'major',
    number,
    label: ROMAN[number],
    element,
    text: {
      en: { name: en, upright: keywords(enUp), reversed: keywords(enRev) },
      zh: { name: zh, upright: keywords(zhUp), reversed: keywords(zhRev) },
    },
  }))
  const minors: TarotCard[] = (Object.keys(MINORS) as Suit[]).flatMap((suit) =>
    MINORS[suit].map(([rank, enUp, enRev, zhUp, zhRev]) => {
      const rankText = RANK_TEXT[String(rank)]
      return {
        id: `${suit}-${typeof rank === 'number' ? String(rank).padStart(2, '0') : rank}`,
        arcana: 'minor' as const,
        suit,
        rank,
        label: rankText.label,
        element: SUIT_TEXT[suit].element,
        text: {
          en: { name: `${rankText.en} of ${SUIT_TEXT[suit].en}`, upright: keywords(enUp), reversed: keywords(enRev) },
          zh: { name: `${SUIT_TEXT[suit].zh}${rankText.zh}`, upright: keywords(zhUp), reversed: keywords(zhRev) },
        },
      }
    }),
  )
  return [...majors, ...minors]
}

/** The 78-card deck in canonical order: majors 0–21, then wands, cups, swords, pentacles. */
export const DECK: readonly TarotCard[] = Object.freeze(buildDeck())

export const suitText = SUIT_TEXT

export function cardById(id: string): TarotCard | undefined {
  return DECK.find((card) => card.id === id)
}

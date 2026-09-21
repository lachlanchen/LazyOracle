import type { Practice, ReadingLanguage } from './types'

export const languageLabels: Record<ReadingLanguage, string> = {
  en: 'English',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  yue: '廣東話',
}

export interface UICopy {
  appName: string
  tagline: string
  practices: Record<Practice, { name: string; blurb: string }>
  comingSoon: string
  home: { eyebrow: string; title: string; privacy: string }
  tarot: {
    eyebrow: string
    title: string
    questionLabel: string
    questionPlaceholder: string
    spreadLabel: string
    draw: string
    drawAgain: string
    revealAll: string
    reading: string
    thinking: string
    offlineNote: string
    upright: string
    reversed: string
    seed: string
    tapToReveal: string
    share: string
    copied: string
  }
  settings: {
    title: string
    language: string
    model: string
    modelBody: string
    endpointEnabled: string
    endpointUrl: string
    endpointToken: string
    modelName: string
    test: string
    testing: string
    testOk: string
    testFailed: string
    save: string
    saved: string
    disclaimerTitle: string
    disclaimer: string
    privacyTitle: string
    privacy: string
  }
  nav: { home: string; settings: string; back: string }
}

const copies: Record<ReadingLanguage, UICopy> = {
  en: {
    appName: 'LazyOracle',
    tagline: 'Cards, stars and hexagrams, computed and read on your own device.',
    practices: {
      tarot: { name: 'Tarot', blurb: 'Seventy-eight cards, three spreads, one honest question.' },
      bazi: { name: 'BaZi', blurb: 'Four pillars from your birth moment.' },
      iching: { name: 'I Ching', blurb: 'Cast the coins, read the changing lines.' },
      astrology: { name: 'Astrology', blurb: 'Your natal chart and the sky today.' },
      fengshui: { name: 'Feng Shui', blurb: 'Eight directions of your home.' },
      palm: { name: 'Palmistry', blurb: 'The lines of your hand.' },
      answers: { name: 'Book of Answers', blurb: 'Ask, open, read.' },
    },
    comingSoon: 'Coming soon',
    home: { eyebrow: 'Choose a practice', title: 'What would you like to ask?', privacy: 'Everything is calculated here on this device. Your question and birth data are never uploaded.' },
    tarot: {
      eyebrow: 'Tarot',
      title: 'Ask the cards',
      questionLabel: 'Your question',
      questionPlaceholder: 'Hold a question in mind, or leave this empty for a general reading',
      spreadLabel: 'Spread',
      draw: 'Shuffle and draw',
      drawAgain: 'Draw again',
      revealAll: 'Reveal all',
      reading: 'Reading',
      thinking: 'Reading the cards…',
      offlineNote: 'Composed from the card meanings. Connect a model in Settings for a narrative reading.',
      upright: 'upright',
      reversed: 'reversed',
      seed: 'Draw',
      tapToReveal: 'Tap a card to turn it',
      share: 'Copy reading',
      copied: 'Copied',
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      model: 'Reading model',
      modelBody: 'Readings are composed on this device from the card meanings. For a narrative reading you can connect a language model: an on-device model (native apps, coming) or an OpenAI-compatible endpoint such as your own LazyEdge workstation or a desktop Ollama.',
      endpointEnabled: 'Use an endpoint for readings',
      endpointUrl: 'Endpoint URL',
      endpointToken: 'Token (optional)',
      modelName: 'Model',
      test: 'Test connection',
      testing: 'Testing…',
      testOk: 'The model answered.',
      testFailed: 'No answer from the endpoint.',
      save: 'Save',
      saved: 'Saved',
      disclaimerTitle: 'For reflection and entertainment',
      disclaimer: 'LazyOracle is a companion for reflection. Its readings are not advice about health, money, law or safety, and they do not predict events.',
      privacyTitle: 'Privacy',
      privacy: 'Cards are drawn and charts are computed on this device. Nothing is sent anywhere unless you enable an endpoint above, in which case only the structured draw and your question go to that endpoint.',
    },
    nav: { home: 'Home', settings: 'Settings', back: 'Back' },
  },
  'zh-Hans': {
    appName: 'LazyOracle',
    tagline: '牌、星与卦，都在你自己的设备上推算与解读。',
    practices: {
      tarot: { name: '塔罗', blurb: '七十八张牌，三种牌阵，一个诚实的问题。' },
      bazi: { name: '八字', blurb: '由出生时刻排出四柱。' },
      iching: { name: '周易', blurb: '掷币起卦，细读变爻。' },
      astrology: { name: '星座', blurb: '你的本命盘与今日星空。' },
      fengshui: { name: '风水', blurb: '家宅八方。' },
      palm: { name: '手相', blurb: '掌中的纹路。' },
      answers: { name: '答案之书', blurb: '发问，翻开，阅读。' },
    },
    comingSoon: '即将推出',
    home: { eyebrow: '选择一种方式', title: '你想问什么？', privacy: '一切都在这台设备上计算。你的问题和出生资料不会被上传。' },
    tarot: {
      eyebrow: '塔罗',
      title: '向牌发问',
      questionLabel: '你的问题',
      questionPlaceholder: '心中默念一个问题，或留空做一次整体解读',
      spreadLabel: '牌阵',
      draw: '洗牌并抽牌',
      drawAgain: '再抽一次',
      revealAll: '全部翻开',
      reading: '解读',
      thinking: '正在解读……',
      offlineNote: '本解读由牌义组合而成。在设置中连接模型后可获得叙事式解读。',
      upright: '正位',
      reversed: '逆位',
      seed: '牌局',
      tapToReveal: '点击牌面翻开',
      share: '复制解读',
      copied: '已复制',
    },
    settings: {
      title: '设置',
      language: '语言',
      model: '解读模型',
      modelBody: '解读默认在本机由牌义组合而成。若想获得叙事式解读，可以连接一个语言模型：设备内模型（原生应用，即将推出），或兼容 OpenAI 接口的端点，例如你自己的 LazyEdge 工作站或桌面上的 Ollama。',
      endpointEnabled: '使用端点生成解读',
      endpointUrl: '端点地址',
      endpointToken: '令牌（可选）',
      modelName: '模型',
      test: '测试连接',
      testing: '测试中……',
      testOk: '模型已回应。',
      testFailed: '端点没有回应。',
      save: '保存',
      saved: '已保存',
      disclaimerTitle: '仅供思考与娱乐',
      disclaimer: 'LazyOracle 是一位陪你思考的伙伴。它的解读不是健康、金钱、法律或安全方面的建议，也不预测事件。',
      privacyTitle: '隐私',
      privacy: '抽牌与排盘都在本设备完成。除非你在上方启用端点，否则不会向任何地方发送数据；启用后也只发送结构化的牌局和你的问题。',
    },
    nav: { home: '首页', settings: '设置', back: '返回' },
  },
  'zh-Hant': {
    appName: 'LazyOracle',
    tagline: '牌、星與卦，都在你自己的裝置上推算與解讀。',
    practices: {
      tarot: { name: '塔羅', blurb: '七十八張牌，三種牌陣，一個誠實的問題。' },
      bazi: { name: '八字', blurb: '由出生時刻排出四柱。' },
      iching: { name: '周易', blurb: '擲幣起卦，細讀變爻。' },
      astrology: { name: '星座', blurb: '你的本命盤與今日星空。' },
      fengshui: { name: '風水', blurb: '家宅八方。' },
      palm: { name: '手相', blurb: '掌中的紋路。' },
      answers: { name: '答案之書', blurb: '發問，翻開，閱讀。' },
    },
    comingSoon: '即將推出',
    home: { eyebrow: '選擇一種方式', title: '你想問什麼？', privacy: '一切都在這台裝置上計算。你的問題和出生資料不會被上傳。' },
    tarot: {
      eyebrow: '塔羅',
      title: '向牌發問',
      questionLabel: '你的問題',
      questionPlaceholder: '心中默念一個問題，或留空做一次整體解讀',
      spreadLabel: '牌陣',
      draw: '洗牌並抽牌',
      drawAgain: '再抽一次',
      revealAll: '全部翻開',
      reading: '解讀',
      thinking: '正在解讀……',
      offlineNote: '本解讀由牌義組合而成。在設定中連接模型後可獲得敘事式解讀。',
      upright: '正位',
      reversed: '逆位',
      seed: '牌局',
      tapToReveal: '點擊牌面翻開',
      share: '複製解讀',
      copied: '已複製',
    },
    settings: {
      title: '設定',
      language: '語言',
      model: '解讀模型',
      modelBody: '解讀預設在本機由牌義組合而成。若想獲得敘事式解讀，可以連接一個語言模型：裝置內模型（原生應用，即將推出），或相容 OpenAI 介面的端點，例如你自己的 LazyEdge 工作站或桌面上的 Ollama。',
      endpointEnabled: '使用端點生成解讀',
      endpointUrl: '端點位址',
      endpointToken: '權杖（可選）',
      modelName: '模型',
      test: '測試連線',
      testing: '測試中……',
      testOk: '模型已回應。',
      testFailed: '端點沒有回應。',
      save: '儲存',
      saved: '已儲存',
      disclaimerTitle: '僅供思考與娛樂',
      disclaimer: 'LazyOracle 是一位陪你思考的夥伴。它的解讀不是健康、金錢、法律或安全方面的建議，也不預測事件。',
      privacyTitle: '隱私',
      privacy: '抽牌與排盤都在本裝置完成。除非你在上方啟用端點，否則不會向任何地方傳送資料；啟用後也只傳送結構化的牌局和你的問題。',
    },
    nav: { home: '首頁', settings: '設定', back: '返回' },
  },
  yue: {
    appName: 'LazyOracle',
    tagline: '牌、星同卦，全部喺你自己部機上面計同解。',
    practices: {
      tarot: { name: '塔羅', blurb: '七十八張牌，三種牌陣，一個老實嘅問題。' },
      bazi: { name: '八字', blurb: '由出生時辰排出四柱。' },
      iching: { name: '周易', blurb: '擲幣起卦，細讀變爻。' },
      astrology: { name: '星座', blurb: '你嘅本命盤同今日星空。' },
      fengshui: { name: '風水', blurb: '屋企八方。' },
      palm: { name: '手相', blurb: '手掌上嘅紋。' },
      answers: { name: '答案之書', blurb: '問，揭開，睇。' },
    },
    comingSoon: '快將推出',
    home: { eyebrow: '揀一種方式', title: '你想問乜嘢？', privacy: '所有嘢都喺呢部機計。你嘅問題同出生資料唔會上傳。' },
    tarot: {
      eyebrow: '塔羅',
      title: '問下啲牌',
      questionLabel: '你嘅問題',
      questionPlaceholder: '心入面諗住一個問題，或者留空做一次整體解讀',
      spreadLabel: '牌陣',
      draw: '洗牌抽牌',
      drawAgain: '再抽一次',
      revealAll: '全部揭開',
      reading: '解讀',
      thinking: '解緊牌……',
      offlineNote: '呢個解讀係由牌義砌出嚟。喺設定連接模型之後可以有敘事式解讀。',
      upright: '正位',
      reversed: '逆位',
      seed: '牌局',
      tapToReveal: '撳張牌揭開',
      share: '複製解讀',
      copied: '複製咗',
    },
    settings: {
      title: '設定',
      language: '語言',
      model: '解讀模型',
      modelBody: '解讀預設喺本機由牌義砌成。想要敘事式解讀，可以連接一個語言模型：機內模型（原生應用，快將推出），或者相容 OpenAI 介面嘅端點，例如你自己嘅 LazyEdge 工作站或桌面 Ollama。',
      endpointEnabled: '用端點生成解讀',
      endpointUrl: '端點位址',
      endpointToken: '權杖（可選）',
      modelName: '模型',
      test: '測試連線',
      testing: '測試緊……',
      testOk: '模型回應咗。',
      testFailed: '端點冇回應。',
      save: '儲存',
      saved: '儲存咗',
      disclaimerTitle: '淨係供思考同娛樂',
      disclaimer: 'LazyOracle 係陪你諗嘢嘅夥伴。佢嘅解讀唔係健康、金錢、法律或者安全方面嘅建議，亦唔會預測事件。',
      privacyTitle: '私隱',
      privacy: '抽牌同排盤都喺呢部機完成。除非你喺上面啟用端點，否則唔會傳送任何資料；啟用之後都只係傳送結構化嘅牌局同你嘅問題。',
    },
    nav: { home: '主頁', settings: '設定', back: '返回' },
  },
}

const LANGUAGE_KEY = 'lazyoracle.language'

export function initialLanguage(): ReadingLanguage {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY) as ReadingLanguage | null
    if (saved && saved in copies) return saved
  } catch {
    // ignore
  }
  const tags = typeof navigator !== 'undefined' ? [navigator.language, ...(navigator.languages ?? [])] : []
  for (const tag of tags) {
    const lower = tag.toLowerCase()
    if (lower.startsWith('yue') || lower === 'zh-hk' || lower === 'zh-mo') return 'yue'
    if (lower.startsWith('zh-hant') || lower === 'zh-tw') return 'zh-Hant'
    if (lower.startsWith('zh')) return 'zh-Hans'
  }
  return 'en'
}

export function rememberLanguage(language: ReadingLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, language)
  } catch {
    // ignore
  }
}

export function uiCopy(language: ReadingLanguage): UICopy {
  return copies[language]
}

import type { Practice, ReadingLanguage } from './types'

export const languageLabels: Record<ReadingLanguage, string> = {
  en: 'English',
  'zh-Hans': '简体中文',
}

export interface UICopy {
  appName: string
  tagline: string
  practices: Record<Practice, { name: string; blurb: string }>
  home: { eyebrow: string; title: string; privacy: string }
  nav: { home: string; settings: string; back: string }
  common: { question: string; questionPlaceholder: string; editProfile: string; approximateHour: string; loading: string }
  reading: { title: string; thinking: string; offlineNote: string; share: string; copied: string }
  profile: {
    title: string
    body: string
    year: string
    month: string
    day: string
    hour: string
    minute: string
    timeUnknown: string
    gender: string
    female: string
    male: string
    place: string
    latitude: string
    longitude: string
    utcOffset: string
    pickCity: string
    enterCoordinates: string
    save: string
  }
  tarot: {
    eyebrow: string
    title: string
    spreadLabel: string
    draw: string
    drawAgain: string
    revealAll: string
    upright: string
    reversed: string
    seed: string
    tapToReveal: string
  }
  iching: { eyebrow: string; title: string; method: string; coins: string; yarrow: string; cast: string; castAgain: string; primary: string; resulting: string; changing: string; noChange: string; judgement: string; line: string }
  bazi: { eyebrow: string; title: string; year: string; month: string; day: string; hour: string; dayMaster: string; elements: string; strength: Record<'strong' | 'balanced' | 'weak', string>; favourable: string; luck: string; thisYear: string; hidden: string; compute: string; solarTerms: string }
  astrology: { eyebrow: string; title: string; ascendant: string; midheaven: string; placements: string; house: string; aspects: string; today: string; noTransits: string; retrograde: string; compute: string }
  fengshui: { eyebrow: string; title: string; gua: string; east: string; west: string; compass: string; enableCompass: string; heading: string; facing: string; good: string; bad: string; noCompass: string; compute: string }
  palm: { eyebrow: string; title: string; takePhoto: string; choosePhoto: string; analysing: string; noHand: string; retake: string; heart: string; heartIndex: string; heartMiddle: string; heartBetween: string; head: string; headStraight: string; headCurved: string; life: string; lifeWide: string; lifeClose: string; read: string; shape: string; hint: string }
  answers: { eyebrow: string; title: string; answers: string; questions: string; open: string; openAgain: string; page: string; hint: string }
  settings: {
    title: string
    language: string
    model: string
    modelBody: string
    cloudTitle: string
    cloudBody: string
    cloudEnabled: string
    preparing: string
    modelCrashed: string
    dismiss: string
    deviceModel: string
    deviceModelBody: string
    none: string
    download: string
    downloading: string
    loaded: string
    remove: string
    profileTitle: string
    clearProfile: string
    disclaimerTitle: string
    disclaimer: string
    privacyTitle: string
    privacy: string
    about: string
  }
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
      palm: { name: 'Palmistry', blurb: 'The shape and lines of your hand.' },
      answers: { name: 'Book of Answers', blurb: 'Ask, open, read.' },
    },
    home: { eyebrow: 'Choose a practice', title: 'What would you like to ask?', privacy: 'Everything is calculated here on this device. Your question and birth data are never uploaded.' },
    nav: { home: 'Home', settings: 'Settings', back: 'Back' },
    common: { question: 'Your question', questionPlaceholder: 'Hold a question in mind, or leave this empty for a general reading', editProfile: 'Edit birth details', approximateHour: 'Birth hour unknown: the hour pillar is approximate.', loading: 'Loading…' },
    reading: { title: 'Reading', thinking: 'Reading…', offlineNote: 'Composed on this device from the computed facts. Turn on Tianji Cloud or download a Tianji model in Settings for a narrative reading.', share: 'Copy reading', copied: 'Copied' },
    profile: {
      title: 'Birth details',
      body: 'Kept only on this device. Used for BaZi, astrology and feng shui.',
      year: 'Year', month: 'Month', day: 'Day', hour: 'Hour (0–23)', minute: 'Minute',
      timeUnknown: 'I do not know the birth time',
      gender: 'Sex at birth', female: 'Female', male: 'Male',
      place: 'Birthplace', latitude: 'Latitude', longitude: 'Longitude', utcOffset: 'UTC offset',
      pickCity: 'Pick a city instead', enterCoordinates: 'Enter coordinates instead',
      save: 'Save and continue',
    },
    tarot: {
      eyebrow: 'Tarot', title: 'Ask the cards', spreadLabel: 'Spread', draw: 'Shuffle and draw', drawAgain: 'Draw again', revealAll: 'Reveal all',
      upright: 'upright', reversed: 'reversed', seed: 'Draw', tapToReveal: 'Tap a card to turn it',
    },
    iching: { eyebrow: 'I Ching', title: 'Cast a hexagram', method: 'Method', coins: 'Three coins', yarrow: 'Yarrow stalks', cast: 'Cast the lines', castAgain: 'Cast again', primary: 'Primary hexagram', resulting: 'Moving toward', changing: 'Changing lines', noChange: 'No changing lines', judgement: 'Judgement', line: 'Line' },
    bazi: { eyebrow: 'BaZi 四柱', title: 'Four pillars', year: 'Year', month: 'Month', day: 'Day', hour: 'Hour', dayMaster: 'Day master', elements: 'Five elements', strength: { strong: 'strong', balanced: 'balanced', weak: 'weak' }, favourable: 'Favourable', luck: 'Luck cycles', thisYear: 'This year', hidden: 'hidden', compute: 'Compute the chart', solarTerms: 'Solar terms' },
    astrology: { eyebrow: 'Astrology', title: 'Natal chart', ascendant: 'Ascendant', midheaven: 'Midheaven', placements: 'Placements', house: 'house', aspects: 'Aspects', today: 'Today\'s sky', noTransits: 'No close transits to your natal planets today.', retrograde: 'retrograde', compute: 'Draw the chart' },
    fengshui: { eyebrow: 'Feng Shui 八宅', title: 'Eight Mansions', gua: 'Personal trigram', east: 'East group', west: 'West group', compass: 'Compass', enableCompass: 'Enable the compass', heading: 'Heading', facing: 'Facing', good: 'Favourable', bad: 'Avoid', noCompass: 'No compass on this device; read the sectors from a map.', compute: 'Find my directions' },
    palm: {
      eyebrow: 'Palmistry', title: 'Your hand', takePhoto: 'Take a photo of your palm', choosePhoto: 'Choose a photo', analysing: 'Finding the hand…', noHand: 'No hand found. Fill the frame with an open palm in good light.', retake: 'Try another photo',
      heart: 'Where does your heart line end?', heartIndex: 'Under the index finger', heartMiddle: 'Under the middle finger', heartBetween: 'Between them',
      head: 'Is your head line straight or curved?', headStraight: 'Straight', headCurved: 'Curved',
      life: 'Does your life line sweep wide or hug the thumb?', lifeWide: 'Sweeps wide', lifeClose: 'Hugs the thumb',
      read: 'Read my hand', shape: 'Hand shape', hint: 'The photo never leaves the device.',
    },
    answers: { eyebrow: 'The books', title: 'Ask and open', answers: 'Book of Answers', questions: 'Book of Questions', open: 'Open the book', openAgain: 'Open again', page: 'Page', hint: 'Hold your question, then open.' },
    settings: {
      title: 'Settings',
      language: 'Language',
      model: 'Reading model',
      modelBody: 'The cards, charts and hexagrams are always computed on this device. The narrative reading comes from Tianji Cloud by default, or from a Tianji model you download once and run offline.',
      cloudTitle: 'Tianji Cloud',
      cloudBody: 'Off by default. When on, only the computed facts and your question go to our reading service, which forwards them to a language model and keeps nothing. Off means fully offline: readings are composed from the facts, or by a downloaded model.',
      cloudEnabled: 'Use Tianji Cloud when no model is downloaded',
      preparing: 'Preparing the model…',
      modelCrashed: '{model} could not start on this phone and the app restarted, so it has been switched off. Try the smaller model, or use Tianji Cloud.',
      dismiss: 'Dismiss',
      deviceModel: 'On-device models',
      deviceModelBody: 'Downloaded once, then everything stays on the phone. Readings take a little longer on older phones.',
      none: 'No download (use Tianji Cloud)',
      download: 'Download and use',
      downloading: 'Downloading',
      loaded: 'Ready',
      remove: 'Stop using',
      profileTitle: 'Birth details',
      clearProfile: 'Delete birth details from this device',
      disclaimerTitle: 'For reflection and entertainment',
      disclaimer: 'LazyOracle is a companion for reflection. Its readings are not advice about health, money, law or safety, and they do not predict events.',
      privacyTitle: 'Privacy',
      privacy: 'Cards are drawn and charts are computed on this device. Photos for palmistry are analysed on the device and never stored. With Tianji Cloud on, only the structured facts of a reading and your question are sent to our reading service for the narrative; it keeps nothing. With it off, nothing leaves the device.',
      about: 'LazyOracle by LazyingArt LLC',
    },
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
      palm: { name: '手相', blurb: '手型与掌纹。' },
      answers: { name: '答案之书', blurb: '发问，翻开，阅读。' },
    },
    home: { eyebrow: '选择一种方式', title: '你想问什么？', privacy: '一切都在这台设备上计算。你的问题和出生资料不会被上传。' },
    nav: { home: '首页', settings: '设置', back: '返回' },
    common: { question: '你的问题', questionPlaceholder: '心中默念一个问题，或留空做一次整体解读', editProfile: '修改出生资料', approximateHour: '出生时辰未知：时柱仅供参考。', loading: '加载中……' },
    reading: { title: '解读', thinking: '正在解读……', offlineNote: '本解读由推算结果在本机组合而成。在设置中开启天机云端或下载天机模型，可获得叙事式解读。', share: '复制解读', copied: '已复制' },
    profile: {
      title: '出生资料',
      body: '只保存在本设备。用于八字、星盘与风水。',
      year: '年', month: '月', day: '日', hour: '时（0–23）', minute: '分',
      timeUnknown: '不知道出生时间',
      gender: '性别', female: '女', male: '男',
      place: '出生地', latitude: '纬度', longitude: '经度', utcOffset: '时区',
      pickCity: '改为选择城市', enterCoordinates: '改为输入经纬度',
      save: '保存并继续',
    },
    tarot: {
      eyebrow: '塔罗', title: '向牌发问', spreadLabel: '牌阵', draw: '洗牌并抽牌', drawAgain: '再抽一次', revealAll: '全部翻开',
      upright: '正位', reversed: '逆位', seed: '牌局', tapToReveal: '点击牌面翻开',
    },
    iching: { eyebrow: '周易', title: '起一卦', method: '起卦方式', coins: '三枚铜钱', yarrow: '蓍草', cast: '起卦', castAgain: '再起一卦', primary: '本卦', resulting: '之卦', changing: '变爻', noChange: '无变爻', judgement: '卦辞', line: '爻' },
    bazi: { eyebrow: '八字 四柱', title: '四柱八字', year: '年柱', month: '月柱', day: '日柱', hour: '时柱', dayMaster: '日主', elements: '五行', strength: { strong: '身强', balanced: '中和', weak: '身弱' }, favourable: '喜用', luck: '大运', thisYear: '流年', hidden: '藏干', compute: '排盘', solarTerms: '节气' },
    astrology: { eyebrow: '星座', title: '本命盘', ascendant: '上升', midheaven: '天顶', placements: '行星落座', house: '宫', aspects: '相位', today: '今日星空', noTransits: '今日与本命行星没有紧密的行运相位。', retrograde: '逆行', compute: '绘制星盘' },
    fengshui: { eyebrow: '风水 八宅', title: '八宅方位', gua: '命卦', east: '东四命', west: '西四命', compass: '罗盘', enableCompass: '开启罗盘', heading: '朝向', facing: '面向', good: '吉方', bad: '凶方', noCompass: '此设备没有罗盘，请对照地图查看方位。', compute: '查看我的方位' },
    palm: {
      eyebrow: '手相', title: '你的手', takePhoto: '拍摄手掌', choosePhoto: '选择照片', analysing: '正在识别手掌……', noHand: '没有识别到手。请在光线充足处张开手掌，占满画面。', retake: '换一张照片',
      heart: '你的感情线止于哪里？', heartIndex: '食指下方', heartMiddle: '中指下方', heartBetween: '两指之间',
      head: '你的智慧线是直的还是弯的？', headStraight: '平直', headCurved: '弯曲',
      life: '你的生命线弧度开阔，还是贴近拇指？', lifeWide: '弧度开阔', lifeClose: '贴近拇指',
      read: '解读我的手', shape: '手型', hint: '照片不会离开本设备。',
    },
    answers: { eyebrow: '两本书', title: '发问并翻开', answers: '答案之书', questions: '问题之书', open: '翻开这本书', openAgain: '再翻一次', page: '第', hint: '心中默念问题，然后翻开。' },
    settings: {
      title: '设置',
      language: '语言',
      model: '解读模型',
      modelBody: '牌、盘与卦始终在本机推算。叙事式解读默认由「天机云端」生成，也可以下载一个天机模型，之后完全离线运行。',
      cloudTitle: '天机云端',
      cloudBody: '默认关闭。开启后，只把推算结果和你的问题发送到我们的解读服务，由它转交给语言模型，服务不保存任何内容。关闭即完全离线：解读由推算结果组合而成，或由已下载的模型生成。',
      cloudEnabled: '未下载模型时使用天机云端',
      preparing: '正在准备模型……',
      modelCrashed: '{model} 在这台手机上无法启动，应用已重新载入，因此已将其关闭。可以改用较小的模型，或使用天机云端。',
      dismiss: '知道了',
      deviceModel: '设备内模型',
      deviceModelBody: '下载一次后，一切都留在手机上。较旧的手机上解读会慢一些。',
      none: '不下载（使用天机云端）',
      download: '下载并使用',
      downloading: '下载中',
      loaded: '已就绪',
      remove: '停止使用',
      profileTitle: '出生资料',
      clearProfile: '从本设备删除出生资料',
      disclaimerTitle: '仅供思考与娱乐',
      disclaimer: 'LazyOracle 是一位陪你思考的伙伴。它的解读不是健康、金钱、法律或安全方面的建议，也不预测事件。',
      privacyTitle: '隐私',
      privacy: '抽牌与排盘都在本设备完成。手相照片在本机识别，不会保存。开启天机云端时，只把结构化的推算结果和你的问题发送到我们的解读服务以生成叙事，服务不保存任何内容；关闭后不会发送任何数据。',
      about: 'LazyOracle · LazyingArt LLC 出品',
    },
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
    if (tag.toLowerCase().startsWith('zh')) return 'zh-Hans'
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

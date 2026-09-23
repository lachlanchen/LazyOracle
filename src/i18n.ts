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
  iching: { eyebrow: string; title: string; method: string; coins: string; yarrow: string; cast: string; castAgain: string; primary: string; resulting: string; changing: string; noChange: string; judgement: string; line: string; related: string; rule: string }
  bazi: { eyebrow: string; title: string; year: string; month: string; day: string; hour: string; dayMaster: string; elements: string; strength: Record<'strong' | 'balanced' | 'weak', string>; favourable: string; luck: string; thisYear: string; hidden: string; compute: string; solarTerms: string }
  astrology: { eyebrow: string; title: string; ascendant: string; midheaven: string; placements: string; house: string; aspects: string; today: string; noTransits: string; retrograde: string; compute: string }
  fengshui: { eyebrow: string; title: string; gua: string; east: string; west: string; compass: string; enableCompass: string; heading: string; facing: string; good: string; bad: string; noCompass: string; compute: string }
  palm: { eyebrow: string; title: string; takePhoto: string; choosePhoto: string; analysing: string; noHand: string; retake: string; heart: string; heartIndex: string; heartMiddle: string; heartBetween: string; head: string; headStraight: string; headCurved: string; life: string; lifeWide: string; lifeClose: string; fate: string; fatePresent: string; fateAbsent: string; fateUnsure: string; read: string; shape: string; fingersLabel: string; palacesLabel: string; handLabel: string; hint: string }
  answers: { eyebrow: string; title: string; answers: string; questions: string; open: string; openAgain: string; page: string; hint: string }
  face: { eyebrow: string; title: string; takePhoto: string; choosePhoto: string; analysing: string; noFace: string; read: string; element: string; courts: string; proportions: string; palaces: string; hint: string }
  almanac: { eyebrow: string; title: string; hint: string; pickDate: string; previousDay: string; nextDay: string; today: string; suitable: string; avoid: string; nothingListed: string; officer: string; clash: string; harm: string; hours: string; pengzu: string; canI: string; read: string }
  chat: { eyebrow: string; title: string; opening: string; placeholder: string; dockPlaceholder: string; send: string; stop: string; clear: string; thinking: string; failed: string; newChat: string; history: string; historyEmpty: string; earlier: string }
  modelPrompt: { title: string; body: string; cloudNote: string; useCloud: string; later: string }
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
    modelTooLarge: string
    dismiss: string
    deviceModel: string
    deviceModelBody: string
    none: string
    useDownloaded: string
    onDevice: string
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
    tagline: 'Cards, stars and hexagrams, computed on your device and explored together.',
    practices: {
      tarot: { name: 'Tarot', blurb: 'Seventy-eight cards, three spreads, one honest question.' },
      bazi: { name: 'BaZi', blurb: 'Four pillars from your birth moment.' },
      iching: { name: 'I Ching', blurb: 'Cast the coins, read the changing lines.' },
      astrology: { name: 'Astrology', blurb: 'Your natal chart and the sky today.' },
      fengshui: { name: 'Feng Shui', blurb: 'Eight directions of your home.' },
      palm: { name: 'Palmistry', blurb: 'The shape and lines of your hand.' },
      face: { name: 'Face Reading', blurb: 'The three courts and twelve palaces of your face.' },
      almanac: { name: 'Almanac', blurb: 'What today suits, and what it does not.' },
      answers: { name: 'Book of Answers', blurb: 'Ask, open, read.' },
      chat: { name: 'Ask Tianji', blurb: 'Talk a reading through in your own words.' },
    },
    home: { eyebrow: 'Choose a practice', title: 'What would you like to ask?', privacy: 'Charts are calculated on this device. Tianji Cloud receives your question, conversation context and reading facts; photos stay here.' },
    nav: { home: 'Home', settings: 'Settings', back: 'Back' },
    common: { question: 'Your question', questionPlaceholder: 'Hold a question in mind, or leave this empty for a general reading', editProfile: 'Edit birth details', approximateHour: 'Birth hour unknown: the hour pillar is approximate.', loading: 'Loading…' },
    reading: { title: 'Reading', thinking: 'Reading…', offlineNote: 'Composed on this device from the computed facts. Tianji Cloud needs an internet connection and can be enabled in Settings.', share: 'Copy reading', copied: 'Copied' },
    profile: {
      title: 'Birth details',
      body: 'Saved on this device for BaZi, astrology and feng shui. Details included in a cloud reading or chat are sent with that request.',
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
    iching: { eyebrow: 'I Ching', title: 'Cast a hexagram', method: 'Method', coins: 'Three coins', yarrow: 'Yarrow stalks', cast: 'Cast the lines', castAgain: 'Cast again', primary: 'Primary hexagram', resulting: 'Moving toward', changing: 'Changing lines', noChange: 'No changing lines', judgement: 'Judgement', line: 'Line', related: 'Inner, counterpart, reverse', rule: 'Where to read' },
    bazi: { eyebrow: 'BaZi 四柱', title: 'Four pillars', year: 'Year', month: 'Month', day: 'Day', hour: 'Hour', dayMaster: 'Day master', elements: 'Five elements', strength: { strong: 'strong', balanced: 'balanced', weak: 'weak' }, favourable: 'Favourable', luck: 'Luck cycles', thisYear: 'This year', hidden: 'hidden', compute: 'Compute the chart', solarTerms: 'Solar terms' },
    astrology: { eyebrow: 'Astrology', title: 'Natal chart', ascendant: 'Ascendant', midheaven: 'Midheaven', placements: 'Placements', house: 'house', aspects: 'Aspects', today: 'Today\'s sky', noTransits: 'No close transits to your natal planets today.', retrograde: 'retrograde', compute: 'Draw the chart' },
    fengshui: { eyebrow: 'Feng Shui 八宅', title: 'Eight Mansions', gua: 'Personal trigram', east: 'East group', west: 'West group', compass: 'Compass', enableCompass: 'Enable the compass', heading: 'Heading', facing: 'Facing', good: 'Favourable', bad: 'Avoid', noCompass: 'No compass on this device; read the sectors from a map.', compute: 'Find my directions' },
    palm: {
      eyebrow: 'Palmistry', title: 'Your hand', takePhoto: 'Take a photo of your palm', choosePhoto: 'Choose a photo', analysing: 'Finding the hand…', noHand: 'No hand found. Fill the frame with an open palm in good light.', retake: 'Try another photo',
      heart: 'Where does your heart line end?', heartIndex: 'Under the index finger', heartMiddle: 'Under the middle finger', heartBetween: 'Between them',
      head: 'Is your head line straight or curved?', headStraight: 'Straight', headCurved: 'Curved',
      life: 'Does your life line sweep wide or hug the thumb?', lifeWide: 'Sweeps wide', lifeClose: 'Hugs the thumb',
      fate: 'Is there a line running up the centre of your palm?', fatePresent: 'Yes, clear', fateAbsent: 'No', fateUnsure: 'Hard to tell',
      read: 'Read my hand', shape: 'Hand shape', fingersLabel: 'Fingers', palacesLabel: 'Palaces', handLabel: 'Hand', hint: 'The photo never leaves the device.',
    },
    face: {
      eyebrow: 'Face reading', title: 'Your face', takePhoto: 'Take a photo', choosePhoto: 'Choose a photo',
      analysing: 'Finding the face…', noFace: 'No face found. Face the camera in even light, with your whole face in the frame.',
      read: 'Read my face', element: 'Face type', courts: 'Three courts', proportions: 'Proportions', palaces: 'Palaces',
      hint: 'The photo is measured on this device and never leaves it.',
    },
    almanac: {
      eyebrow: 'Almanac', title: 'What today suits', hint: 'Straight from the traditional tables: nothing here is guessed.',
      pickDate: 'Pick a date', previousDay: 'The day before', nextDay: 'The day after', today: 'Today',
      suitable: 'Suitable', avoid: 'To avoid', nothingListed: 'Nothing listed', officer: 'Officer, spirit, mansion',
      clash: 'Clash', harm: 'harm to the', hours: 'Favourable hours', pengzu: "Peng Zu's taboos",
      canI: 'Can I do this today?', read: 'Read the day',
    },
    chat: {
      eyebrow: 'Ask Tianji',
      title: 'Talk it through',
      opening: 'Ask anything about a reading you have had, or about tarot, the four pillars, the I Ching, astrology, feng shui, palmistry or the books.',
      placeholder: 'Type your question',
      dockPlaceholder: 'Ask Tianji anything',
      send: 'Send',
      stop: 'Stop',
      clear: 'Clear',
      thinking: 'Thinking…',
      failed: 'The reading model did not answer. Try again, or check Settings.',
      newChat: 'New',
      history: 'History',
      historyEmpty: 'No saved conversations yet.',
      earlier: 'Show earlier messages',
    },
    modelPrompt: {
      title: 'Enable Tianji Cloud for chat',
      body: 'Chat uses Tianji Cloud. The cards, charts and hexagrams are always computed on this device; individual practices also work offline.',
      cloudNote: 'Your question, relevant conversation and computed facts are sent to our reading service. Photos stay on your device.',
      useCloud: 'Use the cloud',
      later: 'Not now',
    },
    answers: { eyebrow: 'The books', title: 'Ask and open', answers: 'Book of Answers', questions: 'Book of Questions', open: 'Open the book', openAgain: 'Open again', page: 'Page', hint: 'Hold your question, then open.' },
    settings: {
      title: 'Settings',
      language: 'Language',
      model: 'Reading model',
      modelBody: 'The cards, charts and hexagrams are computed on this device. Tianji Cloud writes the narrative reading by default, with no model download.',
      cloudTitle: 'Tianji Cloud',
      cloudBody: 'On by default. Your question, conversation context and computed facts go through our relay to the model provider. Turn it off for readings composed on this device from the facts; chat requires the cloud.',
      cloudEnabled: 'Use Tianji Cloud',
      preparing: 'Preparing the model…',
      modelCrashed: '{model} could not start on this phone and the app restarted, so it has been switched off. Try a smaller model, or use Tianji Cloud.',
      modelTooLarge: 'This phone does not have enough free memory for that model. Try Tianji Mini, or use Tianji Cloud, which needs none.',
      dismiss: 'Dismiss',
      deviceModel: 'On-device models',
      deviceModelBody: 'Downloaded once, then everything stays on the phone. Readings take a little longer on older phones.',
      none: 'No download (use Tianji Cloud)',
      download: 'Download and use',
      useDownloaded: 'Use',
      onDevice: 'Already on this device',
      downloading: 'Downloading',
      loaded: 'Ready',
      remove: 'Stop using',
      profileTitle: 'Birth details',
      clearProfile: 'Delete birth details from this device',
      disclaimerTitle: 'For reflection and entertainment',
      disclaimer: 'LazyOracle is a companion for reflection. Its readings are not advice about health, money, law or safety, and they do not predict events.',
      privacyTitle: 'Privacy',
      privacy: 'Cards and charts are computed here. Palm and face photos are measured on the device and are not uploaded. With Tianji Cloud on, your question, relevant conversation and reading facts (which may include birth details) are sent through our relay to the model provider. Turning it off stops cloud reading requests.',
      about: 'LazyOracle by LazyingArt LLC',
    },
  },
  'zh-Hans': {
    appName: 'LazyOracle',
    tagline: '牌、星与卦，在本机推算，一起细读。',
    practices: {
      tarot: { name: '塔罗', blurb: '七十八张牌，三种牌阵，一个诚实的问题。' },
      bazi: { name: '八字', blurb: '由出生时刻排出四柱。' },
      iching: { name: '周易', blurb: '掷币起卦，细读变爻。' },
      astrology: { name: '星座', blurb: '你的本命盘与今日星空。' },
      fengshui: { name: '风水', blurb: '家宅八方。' },
      palm: { name: '手相', blurb: '手型与掌纹。' },
      face: { name: '面相', blurb: '三停、五岳与十二宫。' },
      almanac: { name: '黄历', blurb: '今日宜什么，忌什么。' },
      answers: { name: '答案之书', blurb: '发问，翻开，阅读。' },
      chat: { name: '问天机', blurb: '用自己的话把一次解读聊透。' },
    },
    home: { eyebrow: '选择一种方式', title: '你想问什么？', privacy: '牌与盘都在本机推算。天机云端接收问题、相关对话与推算结果，照片留在本机。' },
    nav: { home: '首页', settings: '设置', back: '返回' },
    common: { question: '你的问题', questionPlaceholder: '心中默念一个问题，或留空做一次整体解读', editProfile: '修改出生资料', approximateHour: '出生时辰未知：时柱仅供参考。', loading: '加载中……' },
    reading: { title: '解读', thinking: '正在解读……', offlineNote: '本解读由推算结果在本机组合而成。天机云端需要网络连接，可在设置中开启。', share: '复制解读', copied: '已复制' },
    profile: {
      title: '出生资料',
      body: '保存在本机，用于八字、星盘与风水。云端解读或对话中包含的出生资料会随请求发送。',
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
    iching: { eyebrow: '周易', title: '起一卦', method: '起卦方式', coins: '三枚铜钱', yarrow: '蓍草', cast: '起卦', castAgain: '再起一卦', primary: '本卦', resulting: '之卦', changing: '变爻', noChange: '无变爻', judgement: '卦辞', line: '爻', related: '互卦 / 错卦 / 综卦', rule: '断法' },
    bazi: { eyebrow: '八字 四柱', title: '四柱八字', year: '年柱', month: '月柱', day: '日柱', hour: '时柱', dayMaster: '日主', elements: '五行', strength: { strong: '身强', balanced: '中和', weak: '身弱' }, favourable: '喜用', luck: '大运', thisYear: '流年', hidden: '藏干', compute: '排盘', solarTerms: '节气' },
    astrology: { eyebrow: '星座', title: '本命盘', ascendant: '上升', midheaven: '天顶', placements: '行星落座', house: '宫', aspects: '相位', today: '今日星空', noTransits: '今日与本命行星没有紧密的行运相位。', retrograde: '逆行', compute: '绘制星盘' },
    fengshui: { eyebrow: '风水 八宅', title: '八宅方位', gua: '命卦', east: '东四命', west: '西四命', compass: '罗盘', enableCompass: '开启罗盘', heading: '朝向', facing: '面向', good: '吉方', bad: '凶方', noCompass: '此设备没有罗盘，请对照地图查看方位。', compute: '查看我的方位' },
    palm: {
      eyebrow: '手相', title: '你的手', takePhoto: '拍摄手掌', choosePhoto: '选择照片', analysing: '正在识别手掌……', noHand: '没有识别到手。请在光线充足处张开手掌，占满画面。', retake: '换一张照片',
      heart: '你的感情线止于哪里？', heartIndex: '食指下方', heartMiddle: '中指下方', heartBetween: '两指之间',
      head: '你的智慧线是直的还是弯的？', headStraight: '平直', headCurved: '弯曲',
      life: '你的生命线弧度开阔，还是贴近拇指？', lifeWide: '弧度开阔', lifeClose: '贴近拇指',
      fate: '掌心中央有一条竖纹（事业线）吗？', fatePresent: '有，清晰', fateAbsent: '没有', fateUnsure: '看不清',
      read: '解读我的手', shape: '手型', fingersLabel: '五指', palacesLabel: '八宫', handLabel: '掌形', hint: '照片不会离开本设备。',
    },
    face: {
      eyebrow: '面相', title: '你的面相', takePhoto: '拍摄面部', choosePhoto: '选择照片',
      analysing: '正在识别面部……', noFace: '没有识别到面部。请正面对准镜头，光线均匀，整张脸在画面内。',
      read: '开始看面相', element: '面型', courts: '三停', proportions: '比例', palaces: '十二宫',
      hint: '照片在本设备上测量，不会离开这台设备。',
    },
    almanac: {
      eyebrow: '黄历', title: '今日宜忌', hint: '直接取自通书诸表，此处没有一句是猜的。',
      pickDate: '选择日期', previousDay: '前一天', nextDay: '后一天', today: '今天',
      suitable: '宜', avoid: '忌', nothingListed: '（无）', officer: '建除·值神·星宿',
      clash: '冲', harm: '煞', hours: '吉时', pengzu: '彭祖百忌',
      canI: '今天适合做什么？', read: '解读今日',
    },
    chat: {
      eyebrow: '问天机',
      title: '聊一聊',
      opening: '可以问刚才的解读，也可以问塔罗、四柱、周易、星座、风水、手相与答案之书。',
      placeholder: '输入你的问题',
      dockPlaceholder: '有什么想问天机的',
      send: '发送',
      stop: '停止',
      clear: '清空',
      thinking: '正在思考……',
      failed: '解读模型没有回应。请再试一次，或到设置中查看。',
      newChat: '新对话',
      history: '历史',
      historyEmpty: '还没有保存的对话。',
      earlier: '显示更早的消息',
    },
    modelPrompt: {
      title: '开启天机云端以开始对话',
      body: '聊天使用天机云端。抽牌、排盘与起卦始终在本机完成，各项功能也提供离线解读。',
      cloudNote: '问题、相关对话与推算结果会发送到我们的解读服务，照片留在本机。',
      useCloud: '使用云端',
      later: '暂不',
    },
    answers: { eyebrow: '两本书', title: '发问并翻开', answers: '答案之书', questions: '问题之书', open: '翻开这本书', openAgain: '再翻一次', page: '第', hint: '心中默念问题，然后翻开。' },
    settings: {
      title: '设置',
      language: '语言',
      model: '解读模型',
      modelBody: '牌、盘与卦始终在本机推算。叙事式解读默认由「天机云端」生成，无需下载模型。',
      cloudTitle: '天机云端',
      cloudBody: '默认开启。问题、相关对话和推算结果经我们的转发服务发送给模型提供方。关闭后，各项解读由推算结果在本机组合而成；聊天需要天机云端。',
      cloudEnabled: '使用天机云端',
      preparing: '正在准备模型……',
      modelCrashed: '{model} 在这台手机上无法启动，应用已重新载入，因此已将其关闭。可以改用较小的模型，或使用天机云端。',
      modelTooLarge: '这台手机可用内存不足以运行该模型。可以改用天机轻量版，或使用无需内存的天机云端。',
      dismiss: '知道了',
      deviceModel: '设备内模型',
      deviceModelBody: '下载一次后，一切都留在手机上。较旧的手机上解读会慢一些。',
      none: '不下载（使用天机云端）',
      download: '下载并使用',
      useDownloaded: '使用',
      onDevice: '已在本机',
      downloading: '下载中',
      loaded: '已就绪',
      remove: '停止使用',
      profileTitle: '出生资料',
      clearProfile: '从本设备删除出生资料',
      disclaimerTitle: '仅供思考与娱乐',
      disclaimer: 'LazyOracle 是一位陪你思考的伙伴。它的解读不是健康、金钱、法律或安全方面的建议，也不预测事件。',
      privacyTitle: '隐私',
      privacy: '抽牌与排盘都在本机完成，手相与面相照片在本机测量，不会上传。开启天机云端时，问题、相关对话和推算结果（可能包含出生资料）经我们的转发服务发送给模型提供方。关闭后不再发送云端解读请求。',
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

/**
 * How each tradition actually reasons.
 *
 * The engines give the model facts; these notes give it method. Without them
 * a language model writes pleasant, interchangeable paragraphs: it names the
 * card and then says something general. With them it has to do what a reader
 * does, in the order a reader does it, and cite the rule it is following.
 *
 * Every note is a summary of standard practice in that tradition, with its
 * source named so a reader can check it. They are guidance for interpretation,
 * not claims that any of this predicts events.
 */
import type { ReadingLanguage } from '../types'

export type Practice = 'tarot' | 'bazi' | 'iching' | 'astrology' | 'fengshui' | 'palm' | 'face' | 'answers'

interface Note {
  /** The method, in the order the reader applies it. */
  en: string[]
  zh: string[]
  /** Where the method comes from, shown to the model and quotable. */
  source: { en: string; zh: string }
}

const NOTES: Record<Practice, Note> = {
  tarot: {
    en: [
      'Read the spread as one sentence before reading it as several: the position of each card modifies its meaning, and a card in the "obstacle" seat is not the same card as in the "outcome" seat.',
      'A reversal weakens, delays or turns a card inward; it does not simply negate it.',
      'Weigh the majors above the minors, and a repeated suit above a single card: three cups in a spread say more about the reading than any one of them.',
      'Court cards usually describe a stance the reader can take, not a stranger who will arrive.',
      'End with what the reader can do this week, drawn from the cards in front of you.',
    ],
    zh: [
      '先把整个牌阵读成一句话，再逐张读：位置改变含义，落在「阻碍」位的牌与落在「结果」位的同一张牌并不相同。',
      '逆位是减弱、延迟或转向内在，而不是简单的否定。',
      '大阿尔克那重于小阿尔克那，重复出现的花色重于单张：牌阵里出现三张圣杯，比其中任何一张都更能说明问题。',
      '宫廷牌通常描述来访者可以采取的姿态，而不是即将出现的某个人。',
      '最后落到这一周可以做的一件事上，而且必须由眼前的牌推出。',
    ],
    source: { en: 'Standard practice in the Rider–Waite–Smith tradition.', zh: '韦特体系的通行读法。' },
  },
  bazi: {
    en: [
      'Judge the day master first: its strength comes from the month branch above all, then from roots in the other branches, then from stems that produce or match it.',
      'Only then name the useful god (用神): what the chart lacks or what drains an excess, and say plainly which element that is.',
      'Read the ten gods as roles rather than fortunes: an output star describes how the person expresses, a wealth star how they hold and spend, an officer star how they meet authority.',
      'Hidden stems matter when the branch is opened by a clash or combination; say so when you use one.',
      'A luck pillar shifts the weather, not the chart. Compare the incoming element with the useful god, and describe the decade in those terms.',
    ],
    zh: [
      '先断日主旺衰：以月令为最重，其次看地支通根，再看天干生扶比劫。',
      '然后才定用神：补其所缺，或泄其太过，并明确指出是哪一个五行。',
      '十神当作角色来读，而非吉凶：食伤是表达方式，财星是聚散之道，官杀是面对权威的姿态。',
      '藏干在刑冲合会引动时才显力，用到时要说明。',
      '大运只改变气候，不改变命局。把来运的五行与用神对照，再据此描述这十年。',
    ],
    source: { en: 'The 子平 method, as set out in 《滴天髓》 and 《穷通宝鉴》.', zh: '子平法，见《滴天髓》《穷通宝鉴》。' },
  },
  iching: {
    en: [
      'Follow the rule for where the answer sits before interpreting anything: the number of moving lines decides whether the judgement, one line, two lines or the resulting hexagram answers.',
      'Name the two trigrams and what their relation describes, since the image usually carries the advice.',
      'A moving line is the point where the situation is already turning; read it as present movement, not prophecy.',
      'The nuclear hexagram shows what is inside the situation, and the resulting hexagram where it tends. Mention each once, briefly.',
      'Keep the classical judgement quoted exactly as given, then say what it means here.',
    ],
    zh: [
      '先依断法确定答案所在：变爻数目决定该看卦辞、某一爻、两爻，还是之卦。',
      '点出上下两卦及其相互关系，卦象往往就是劝告本身。',
      '变爻是局面正在转动之处，读作当下的动向，而非预言。',
      '互卦见事之内情，之卦见事之所趋，各提一次即可。',
      '卦辞照原文引用，再解释它在此事上的意思。',
    ],
    source: { en: "Zhu Xi's rules in 《易学启蒙》, with the judgements of the 《周易》.", zh: '朱熹《易学启蒙》断例，卦爻辞据《周易》。' },
  },
  astrology: {
    en: [
      'Work from the chart ruler and the ascendant outward: they set the manner, before any single placement.',
      'A planet is described by sign (how), house (where) and aspect (with what). Give all three before drawing a conclusion.',
      'Tight aspects outrank wide ones; an orb over six degrees is a whisper, not a statement.',
      'Retrograde is a change of direction inward, not a misfortune.',
      'A transit shows timing for something already in the natal chart. If nothing in the chart supports it, say the transit passes lightly.',
    ],
    zh: [
      '从命主星与上升开始，由内而外：它们决定风格，先于任何单一行星。',
      '一颗行星由星座（如何）、宫位（在何处）与相位（与谁）共同说明，三者齐备再下结论。',
      '紧密相位重于宽松相位；容许度超过六度只是低语，不是断言。',
      '逆行是方向转向内在，不是灾祸。',
      '行运只说明时机，且必须对应本命已有的配置；本命无据者，说这次行运影响轻微。',
    ],
    source: { en: 'Traditional and modern practice: whole-sign houses, Ptolemaic aspects.', zh: '传统与现代通行做法：整宫制、托勒密相位。' },
  },
  fengshui: {
    en: [
      'Eight Mansions works from the person, not the room: the life gua sets which four directions suit them and which four do not.',
      'Give each sector its classical name and its use, and prefer the practical placement (door, desk, bed, stove) to atmosphere.',
      'An unfavourable sector is managed, not feared: storage, a bathroom, or a door that is simply used less.',
      'Never promise wealth, health or safety from a direction. Say what to try and how to notice whether it helps.',
    ],
    zh: [
      '八宅以人为本，不以房为本：命卦决定四吉方与四凶方。',
      '每一方位给出本名与用法，重在实际摆放（门、书桌、床、灶），而非氛围。',
      '凶方是化解而非畏惧：作储物、卫浴，或少走的门。',
      '不得承诺某个方位带来财富、健康或平安；只说可以怎样试，以及如何判断是否有用。',
    ],
    source: { en: 'The Eight Mansions (八宅) school, after 《八宅明镜》.', zh: '八宅派，参《八宅明镜》。' },
  },
  palm: {
    en: [
      'Shape first, then lines: the elemental hand describes the pace a person works at, and the lines describe habits grown into.',
      'Proportion carries more than length: a finger is long or short only against the middle finger, and a palace is full or flat only against the rest of the palm.',
      'The lines were described by the reader, not measured. Treat them as their own account of themselves and say so once.',
      'Speak about tendencies and choices, never about health, lifespan or character defects.',
    ],
    zh: [
      '先看手型，再看纹路：五行手型说的是做事的节奏，纹路说的是养成的习惯。',
      '比例重于长度：手指的长短只相对中指而言，八宫的丰薄只相对整个手掌而言。',
      '三大主线由来访者自述而非测量所得，要提一次这一点。',
      '只谈倾向与选择，不谈健康、寿数或性格缺陷。',
    ],
    source: { en: 'Western chirognomy for the hand types, 掌相八宫 for the palaces.', zh: '手型取西洋手相学，八宫取中国掌相。' },
  },
  face: {
    en: [
      'Read the three courts as proportion, not as beauty: they divide a life into its early, middle and later parts, and an even division is unremarkable rather than good.',
      'Every judgement must name the measurement behind it, because the measurements are the only evidence here.',
      'A palace that is neither generous nor narrow is worth saying nothing about; crowding the reading with every palace makes it meaningless.',
      'Never comment on attractiveness, race, health or intelligence, and never suggest a face predicts behaviour in others.',
    ],
    zh: [
      '三停看的是比例而非美丑：它把一生分为早、中、晚三段，均匀只是寻常，并非吉。',
      '每一句判断都要点出所依据的量度，因为量度是此处唯一的凭据。',
      '不丰不窄的宫位不必多说；把十二宫逐一铺陈只会让解读失去意义。',
      '绝不评论美丑、族裔、健康或智力，也不得暗示面相可以预测他人的行为。',
    ],
    source: { en: 'Chinese physiognomy: 三停五眼 proportion and the 十二宫 palaces.', zh: '中国相术：三停五眼之度与十二宫。' },
  },
  answers: {
    en: [
      'The page is the answer. Do not explain it away, and do not add a second answer of your own.',
      'Connect the line to the question in one or two sentences, then stop.',
    ],
    zh: ['书页就是答案，不要把它解释掉，也不要另给一个答案。', '用一两句把这一行与所问之事连起来，然后停下。'],
  source: { en: 'The Book of Answers form: one page, one line.', zh: '答案之书的体例：一页一句。' },
  },
}

/** The method note for a practice, as prompt lines. */
export function methodNote(practice: Practice, language: ReadingLanguage): string[] {
  const note = NOTES[practice]
  const lines = language === 'en' ? note.en : note.zh
  const source = language === 'en' ? note.source.en : note.source.zh
  const heading = language === 'en' ? 'Method, follow it in this order:' : '读法，按此顺序进行：'
  const cite = language === 'en' ? `Method source: ${source}` : `方法依据：${source}`
  return [heading, ...lines.map((line) => `- ${line}`), cite]
}

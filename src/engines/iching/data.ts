/**
 * The 64 hexagrams in King Wen order. Trigram lines are listed bottom to top
 * (1 = yang, 0 = yin). The classical judgement text (卦辞) is public domain;
 * the keywords are our own condensed readings of it.
 */
export type Line = 0 | 1

export interface Trigram {
  id: 'qian' | 'kun' | 'zhen' | 'xun' | 'kan' | 'li' | 'gen' | 'dui'
  name: { zh: string; en: string }
  lines: [Line, Line, Line]
  nature: { zh: string; en: string }
  direction: { zh: string; en: string }
}

export const TRIGRAMS: Record<Trigram['id'], Trigram> = {
  qian: { id: 'qian', name: { zh: '乾', en: 'Heaven' }, lines: [1, 1, 1], nature: { zh: '天', en: 'the creative' }, direction: { zh: '西北', en: 'northwest' } },
  dui: { id: 'dui', name: { zh: '兑', en: 'Lake' }, lines: [1, 1, 0], nature: { zh: '泽', en: 'the joyous' }, direction: { zh: '西', en: 'west' } },
  li: { id: 'li', name: { zh: '离', en: 'Fire' }, lines: [1, 0, 1], nature: { zh: '火', en: 'the clinging' }, direction: { zh: '南', en: 'south' } },
  zhen: { id: 'zhen', name: { zh: '震', en: 'Thunder' }, lines: [1, 0, 0], nature: { zh: '雷', en: 'the arousing' }, direction: { zh: '东', en: 'east' } },
  xun: { id: 'xun', name: { zh: '巽', en: 'Wind' }, lines: [0, 1, 1], nature: { zh: '风', en: 'the gentle' }, direction: { zh: '东南', en: 'southeast' } },
  kan: { id: 'kan', name: { zh: '坎', en: 'Water' }, lines: [0, 1, 0], nature: { zh: '水', en: 'the abysmal' }, direction: { zh: '北', en: 'north' } },
  gen: { id: 'gen', name: { zh: '艮', en: 'Mountain' }, lines: [0, 0, 1], nature: { zh: '山', en: 'keeping still' }, direction: { zh: '东北', en: 'northeast' } },
  kun: { id: 'kun', name: { zh: '坤', en: 'Earth' }, lines: [0, 0, 0], nature: { zh: '地', en: 'the receptive' }, direction: { zh: '西南', en: 'southwest' } },
}

export interface HexagramData {
  number: number
  lower: Trigram['id']
  upper: Trigram['id']
  name: { zh: string; pinyin: string; en: string }
  /** Classical judgement (卦辞). */
  judgement: string
  keywords: { zh: string[]; en: string[] }
  /** One-sentence sense of the hexagram, our words. */
  sense: { zh: string; en: string }
}

type Row = [number, Trigram['id'], Trigram['id'], string, string, string, string, string, string, string, string]
// number, lower, upper, zh, pinyin, en, judgement, zh keywords, en keywords, zh sense, en sense
const ROWS: Row[] = [
  [1, 'qian', 'qian', '乾', 'Qián', 'The Creative', '元亨利贞。', '刚健、创始、持续', 'strength, initiative, persistence', '天行健，君子以自强不息。', 'Heaven moves with strength; keep going under your own power.'],
  [2, 'kun', 'kun', '坤', 'Kūn', 'The Receptive', '元亨，利牝马之贞。君子有攸往，先迷后得主，利。西南得朋，东北丧朋。安贞吉。', '包容、承载、顺势', 'receptivity, devotion, following', '地势坤，君子以厚德载物。', 'Earth carries everything; hold and support rather than lead.'],
  [3, 'zhen', 'kan', '屯', 'Zhūn', 'Difficulty at the Beginning', '元亨利贞。勿用有攸往，利建侯。', '初创、艰难、扎根', 'sprouting, initial difficulty, gathering helpers', '云雷屯，君子以经纶。', 'A sprout pushing through; order the chaos before advancing.'],
  [4, 'kan', 'gen', '蒙', 'Méng', 'Youthful Folly', '亨。匪我求童蒙，童蒙求我。初筮告，再三渎，渎则不告。利贞。', '蒙昧、学习、请教', 'inexperience, learning, seeking a teacher', '山下出泉，蒙，君子以果行育德。', 'A spring at the foot of the mountain: ask sincerely, and once.'],
  [5, 'qian', 'kan', '需', 'Xū', 'Waiting', '有孚，光亨，贞吉。利涉大川。', '等待、耐心、信心', 'waiting, nourishment, confidence', '云上于天，需，君子以饮食宴乐。', 'Clouds gather; the rain will come, so wait with confidence.'],
  [6, 'kan', 'qian', '讼', 'Sòng', 'Conflict', '有孚窒惕，中吉，终凶。利见大人，不利涉大川。', '争讼、分歧、慎争', 'dispute, contention, stopping halfway', '天与水违行，讼，君子以作事谋始。', 'Heaven and water pull apart; settle early rather than fight to the end.'],
  [7, 'kan', 'kun', '师', 'Shī', 'The Army', '贞，丈人吉，无咎。', '统领、纪律、集众', 'discipline, leadership, organised effort', '地中有水，师，君子以容民畜众。', 'Water within the earth: strength lies in an organised, disciplined body.'],
  [8, 'kun', 'kan', '比', 'Bǐ', 'Holding Together', '吉。原筮元永贞，无咎。不宁方来，后夫凶。', '亲近、结盟、归附', 'union, alliance, belonging', '地上有水，比，先王以建万国，亲诸侯。', 'Water on the earth flows together; join in good time, not late.'],
  [9, 'qian', 'xun', '小畜', 'Xiǎo Chù', 'Small Taming', '亨。密云不雨，自我西郊。', '小积、克制、蓄势', 'small restraint, gathering, not yet', '风行天上，小畜，君子以懿文德。', 'Dense clouds, no rain yet: small steps and refinement.'],
  [10, 'dui', 'qian', '履', 'Lǚ', 'Treading', '履虎尾，不咥人，亨。', '谨慎、礼行、履险', 'careful conduct, courtesy, treading carefully', '上天下泽，履，君子以辩上下，定民志。', 'Treading on the tiger\'s tail: good manners carry you through.'],
  [11, 'qian', 'kun', '泰', 'Tài', 'Peace', '小往大来，吉亨。', '通泰、和顺、繁荣', 'peace, harmony, flourishing', '天地交泰，后以财成天地之道。', 'Heaven and earth meet; things flow, though nothing stays flat forever.'],
  [12, 'kun', 'qian', '否', 'Pǐ', 'Standstill', '否之匪人，不利君子贞。大往小来。', '闭塞、不通、退守', 'stagnation, blockage, withdrawal', '天地不交，否，君子以俭德辟难。', 'Heaven and earth do not meet; keep your virtue and wait it out.'],
  [13, 'li', 'qian', '同人', 'Tóng Rén', 'Fellowship', '同人于野，亨。利涉大川，利君子贞。', '同心、合作、开放', 'fellowship, openness, common cause', '天与火，同人，君子以类族辨物。', 'Fellowship in the open field: join others around a shared aim.'],
  [14, 'qian', 'li', '大有', 'Dà Yǒu', 'Great Possession', '元亨。', '丰盛、光明、大得', 'abundance, clarity, great holding', '火在天上，大有，君子以遏恶扬善。', 'Fire above heaven: much is held, so hold it with care.'],
  [15, 'gen', 'kun', '谦', 'Qiān', 'Modesty', '亨，君子有终。', '谦逊、低调、有终', 'modesty, balance, completion', '地中有山，谦，君子以裒多益寡。', 'A mountain inside the earth: quiet capability finishes what it starts.'],
  [16, 'kun', 'zhen', '豫', 'Yù', 'Enthusiasm', '利建侯行师。', '愉悦、准备、顺势而动', 'enthusiasm, readiness, movement with the times', '雷出地奋，豫，先王以作乐崇德。', 'Thunder comes out of the earth: energy that carries others along.'],
  [17, 'zhen', 'dui', '随', 'Suí', 'Following', '元亨利贞，无咎。', '随顺、适应、跟随', 'following, adapting, going along', '泽中有雷，随，君子以向晦入宴息。', 'Thunder within the lake: adapt to the moment and rest when it is time.'],
  [18, 'xun', 'gen', '蛊', 'Gǔ', 'Work on What Has Been Spoiled', '元亨，利涉大川。先甲三日，后甲三日。', '整治、修复、除弊', 'repair, decay, setting right', '山下有风，蛊，君子以振民育德。', 'Wind below the mountain: something spoiled needs patient repair.'],
  [19, 'dui', 'kun', '临', 'Lín', 'Approach', '元亨利贞。至于八月有凶。', '临近、成长、督导', 'approach, growth, oversight', '泽上有地，临，君子以教思无穷。', 'Earth above the lake: a growing influence, to be used while it lasts.'],
  [20, 'kun', 'xun', '观', 'Guān', 'Contemplation', '盥而不荐，有孚颙若。', '观察、审视、示范', 'contemplation, observation, example', '风行地上，观，先王以省方观民设教。', 'Wind over the earth: look carefully before acting, and be seen doing so.'],
  [21, 'zhen', 'li', '噬嗑', 'Shì Kè', 'Biting Through', '亨，利用狱。', '决断、除障、明辨', 'decisiveness, removing an obstacle, judgement', '雷电噬嗑，先王以明罚敕法。', 'Thunder and lightning: bite through the obstacle cleanly.'],
  [22, 'li', 'gen', '贲', 'Bì', 'Grace', '亨，小利有攸往。', '修饰、文采、形式', 'adornment, form, small matters', '山下有火，贲，君子以明庶政，无敢折狱。', 'Fire at the foot of the mountain: beauty and form, for small things.'],
  [23, 'kun', 'gen', '剥', 'Bō', 'Splitting Apart', '不利有攸往。', '剥落、衰退、守静', 'erosion, decline, keeping still', '山附于地，剥，上以厚下安宅。', 'The mountain rests on the earth: something is being stripped away; do not push.'],
  [24, 'zhen', 'kun', '复', 'Fù', 'Return', '亨。出入无疾，朋来无咎。反复其道，七日来复。利有攸往。', '回归、复苏、转机', 'return, renewal, the turning point', '雷在地中，复，先王以至日闭关。', 'Thunder within the earth: the turning point; light returns quietly.'],
  [25, 'zhen', 'qian', '无妄', 'Wú Wàng', 'Innocence', '元亨利贞。其匪正有眚，不利有攸往。', '无妄、真诚、不妄为', 'innocence, sincerity, the unexpected', '天下雷行，物与无妄，先王以茂对时育万物。', 'Thunder under heaven: act sincerely and do not force.'],
  [26, 'qian', 'gen', '大畜', 'Dà Chù', 'Great Taming', '利贞。不家食吉，利涉大川。', '积蓄、沉潜、大蓄', 'great accumulation, restraint, stored power', '天在山中，大畜，君子以多识前言往行。', 'Heaven within the mountain: great power held in check and stored.'],
  [27, 'zhen', 'gen', '颐', 'Yí', 'Nourishment', '贞吉。观颐，自求口实。', '养育、饮食、自养', 'nourishment, care, what you feed on', '山下有雷，颐，君子以慎言语，节饮食。', 'Thunder below the mountain: watch what you take in and what you give out.'],
  [28, 'xun', 'dui', '大过', 'Dà Guò', 'Great Excess', '栋桡，利有攸往，亨。', '超载、过度、非常之时', 'excess, overload, extraordinary times', '泽灭木，大过，君子以独立不惧。', 'The lake rises over the trees: the beam sags; act boldly but alone.'],
  [29, 'kan', 'kan', '坎', 'Kǎn', 'The Abysmal', '习坎，有孚，维心亨，行有尚。', '险陷、重险、诚心渡难', 'danger, repeated pitfalls, sincerity', '水洊至，习坎，君子以常德行，习教事。', 'Water upon water: through repeated danger, keep the heart steady.'],
  [30, 'li', 'li', '离', 'Lí', 'The Clinging', '利贞，亨。畜牝牛吉。', '光明、依附、清晰', 'brightness, clinging, clarity', '明两作，离，大人以继明照于四方。', 'Fire upon fire: brightness that depends on what it burns.'],
  [31, 'gen', 'dui', '咸', 'Xián', 'Influence', '亨，利贞，取女吉。', '感应、吸引、相通', 'attraction, mutual influence, courtship', '山上有泽，咸，君子以虚受人。', 'The lake on the mountain: openness draws things together.'],
  [32, 'xun', 'zhen', '恒', 'Héng', 'Duration', '亨，无咎，利贞，利有攸往。', '恒久、坚持、常道', 'duration, constancy, the long road', '雷风恒，君子以立不易方。', 'Thunder and wind: what lasts is what keeps moving in its own way.'],
  [33, 'gen', 'qian', '遁', 'Dùn', 'Retreat', '亨，小利贞。', '退避、隐退、保全', 'retreat, withdrawal, timing', '天下有山，遁，君子以远小人，不恶而严。', 'The mountain under heaven: a well-timed retreat is strength.'],
  [34, 'qian', 'zhen', '大壮', 'Dà Zhuàng', 'Great Power', '利贞。', '强盛、力量、守正', 'great strength, vigour, restraint', '雷在天上，大壮，君子以非礼弗履。', 'Thunder above heaven: great strength needs a straight path.'],
  [35, 'kun', 'li', '晋', 'Jìn', 'Progress', '康侯用锡马蕃庶，昼日三接。', '前进、晋升、光明', 'progress, advancement, recognition', '明出地上，晋，君子以自昭明德。', 'The sun rises over the earth: steady, visible progress.'],
  [36, 'li', 'kun', '明夷', 'Míng Yí', 'Darkening of the Light', '利艰贞。', '晦暗、韬光、隐忍', 'darkening, adversity, hiding one\'s light', '明入地中，明夷，君子以莅众，用晦而明。', 'The light goes into the earth: keep your brightness inside for now.'],
  [37, 'li', 'xun', '家人', 'Jiā Rén', 'The Family', '利女贞。', '家庭、本分、内治', 'family, roles, order at home', '风自火出，家人，君子以言有物而行有恒。', 'Wind from fire: order begins at home, in words and habits.'],
  [38, 'dui', 'li', '睽', 'Kuí', 'Opposition', '小事吉。', '对立、分歧、小事可为', 'opposition, estrangement, small matters', '上火下泽，睽，君子以同而异。', 'Fire above, lake below: differences; keep to small things.'],
  [39, 'gen', 'kan', '蹇', 'Jiǎn', 'Obstruction', '利西南，不利东北。利见大人，贞吉。', '阻碍、艰难、回身', 'obstruction, difficulty, turning back to regroup', '山上有水，蹇，君子以反身修德。', 'Water on the mountain: the path is blocked; turn inward and seek help.'],
  [40, 'kan', 'zhen', '解', 'Xiè', 'Deliverance', '利西南。无所往，其来复吉。有攸往，夙吉。', '解除、释放、缓解', 'release, relief, resolution', '雷雨作，解，君子以赦过宥罪。', 'Thunder and rain: the tension breaks; act quickly, then let go.'],
  [41, 'dui', 'gen', '损', 'Sǔn', 'Decrease', '有孚，元吉，无咎，可贞，利有攸往。曷之用？二簋可用享。', '减损、节制、以少为足', 'decrease, simplicity, giving up', '山下有泽，损，君子以惩忿窒欲。', 'The lake below the mountain: less is enough; give from below to above.'],
  [42, 'zhen', 'xun', '益', 'Yì', 'Increase', '利有攸往，利涉大川。', '增益、助益、进取', 'increase, benefit, time to act', '风雷益，君子以见善则迁，有过则改。', 'Wind and thunder: gain that comes from giving; a good time to move.'],
  [43, 'qian', 'dui', '夬', 'Guài', 'Breakthrough', '扬于王庭，孚号有厉。告自邑，不利即戎，利有攸往。', '决断、突破、公开', 'breakthrough, resolve, speaking out', '泽上于天，夬，君子以施禄及下，居德则忌。', 'The lake rises to heaven: a decisive break, made in the open.'],
  [44, 'xun', 'qian', '姤', 'Gòu', 'Coming to Meet', '女壮，勿用取女。', '相遇、意外、防微', 'encounter, temptation, watching small beginnings', '天下有风，姤，后以施命诰四方。', 'Wind under heaven: an unexpected meeting; note what is small now.'],
  [45, 'kun', 'dui', '萃', 'Cuì', 'Gathering Together', '亨。王假有庙，利见大人，亨，利贞。用大牲吉，利有攸往。', '聚集、汇合、共同', 'gathering, community, assembly', '泽上于地，萃，君子以除戎器，戒不虞。', 'The lake over the earth: people gather; prepare for what a crowd brings.'],
  [46, 'xun', 'kun', '升', 'Shēng', 'Pushing Upward', '元亨，用见大人，勿恤，南征吉。', '上升、生长、稳步', 'ascent, growth, steady effort', '地中生木，升，君子以顺德，积小以高大。', 'Wood grows within the earth: rise step by step, without haste.'],
  [47, 'kan', 'dui', '困', 'Kùn', 'Oppression', '亨，贞，大人吉，无咎。有言不信。', '困顿、受限、内守', 'exhaustion, confinement, keeping faith', '泽无水，困，君子以致命遂志。', 'The lake has no water: hard times; words will not help, character will.'],
  [48, 'xun', 'kan', '井', 'Jǐng', 'The Well', '改邑不改井，无丧无得，往来井井。汔至亦未繘井，羸其瓶，凶。', '源泉、根本、滋养', 'the well, the source, what sustains', '木上有水，井，君子以劳民劝相。', 'Water above wood: the source is constant; tend it and draw fully.'],
  [49, 'li', 'dui', '革', 'Gé', 'Revolution', '己日乃孚，元亨利贞，悔亡。', '变革、更新、革故', 'revolution, renewal, shedding the old', '泽中有火，革，君子以治历明时。', 'Fire within the lake: change when the time is ripe, and be believed.'],
  [50, 'xun', 'li', '鼎', 'Dǐng', 'The Cauldron', '元吉，亨。', '鼎新、承载、成就', 'the cauldron, transformation, nourishment of the new', '木上有火，鼎，君子以正位凝命。', 'Fire over wood: the new is cooked and served; take your place.'],
  [51, 'zhen', 'zhen', '震', 'Zhèn', 'The Arousing', '亨。震来虩虩，笑言哑哑。震惊百里，不丧匕鬯。', '震动、惊醒、振作', 'shock, awakening, keeping composure', '洊雷，震，君子以恐惧修省。', 'Thunder upon thunder: a shock that wakes; keep your hands steady.'],
  [52, 'gen', 'gen', '艮', 'Gèn', 'Keeping Still', '艮其背，不获其身，行其庭，不见其人，无咎。', '静止、止步、安定', 'stillness, stopping, rest', '兼山，艮，君子以思不出其位。', 'Mountain upon mountain: stop where stopping is right.'],
  [53, 'gen', 'xun', '渐', 'Jiàn', 'Gradual Progress', '女归吉，利贞。', '渐进、循序、稳步', 'gradual progress, patience, development', '山上有木，渐，君子以居贤德善俗。', 'A tree on the mountain: growth that is slow, orderly and lasting.'],
  [54, 'dui', 'zhen', '归妹', 'Guī Mèi', 'The Marrying Maiden', '征凶，无攸利。', '归属、被动、慎进', 'a subordinate position, tact, restraint', '泽上有雷，归妹，君子以永终知敝。', 'Thunder over the lake: enter a relationship knowing its limits.'],
  [55, 'li', 'zhen', '丰', 'Fēng', 'Abundance', '亨，王假之，勿忧，宜日中。', '丰盛、鼎盛、日中', 'abundance, fullness, the zenith', '雷电皆至，丰，君子以折狱致刑。', 'Thunder and lightning together: the peak; enjoy it, and know it passes.'],
  [56, 'gen', 'li', '旅', 'Lǚ', 'The Wanderer', '小亨，旅贞吉。', '旅途、客居、谨慎', 'travel, transience, the stranger', '山上有火，旅，君子以明慎用刑，而不留狱。', 'Fire on the mountain: passing through; be modest and keep moving.'],
  [57, 'xun', 'xun', '巽', 'Xùn', 'The Gentle', '小亨，利有攸往，利见大人。', '柔顺、渗透、温和', 'gentleness, penetration, persistence', '随风，巽，君子以申命行事。', 'Wind upon wind: gentle, repeated influence gets through.'],
  [58, 'dui', 'dui', '兑', 'Duì', 'The Joyous', '亨，利贞。', '喜悦、交流、和悦', 'joy, openness, exchange', '丽泽，兑，君子以朋友讲习。', 'Lake upon lake: joy shared with friends, and honest talk.'],
  [59, 'kan', 'xun', '涣', 'Huàn', 'Dispersion', '亨。王假有庙，利涉大川，利贞。', '涣散、消解、化开', 'dispersion, dissolving, release of rigidity', '风行水上，涣，先王以享于帝立庙。', 'Wind over water: what was rigid dissolves; gather people around meaning.'],
  [60, 'dui', 'kan', '节', 'Jié', 'Limitation', '亨。苦节不可贞。', '节制、限度、分寸', 'limits, measure, moderation', '泽上有水，节，君子以制数度，议德行。', 'Water over the lake: limits give shape, but bitter limits do not last.'],
  [61, 'dui', 'xun', '中孚', 'Zhōng Fú', 'Inner Truth', '豚鱼吉，利涉大川，利贞。', '诚信、真心、感通', 'inner truth, sincerity, trust', '泽上有风，中孚，君子以议狱缓死。', 'Wind over the lake: sincerity reaches even the simplest creatures.'],
  [62, 'gen', 'zhen', '小过', 'Xiǎo Guò', 'Small Excess', '亨，利贞，可小事，不可大事。飞鸟遗之音，不宜上，宜下，大吉。', '小过、谨小慎微、宜下不宜上', 'small excess, attention to detail, staying low', '山上有雷，小过，君子以行过乎恭。', 'Thunder on the mountain: do small things very well; do not fly high.'],
  [63, 'li', 'kan', '既济', 'Jì Jì', 'After Completion', '亨小，利贞，初吉终乱。', '完成、已成、慎终', 'completion, order achieved, vigilance', '水在火上，既济，君子以思患而豫防之。', 'Water over fire: done, in balance; watch that it does not slip.'],
  [64, 'kan', 'li', '未济', 'Wèi Jì', 'Before Completion', '亨，小狐汔济，濡其尾，无攸利。', '未成、将成、慎行', 'not yet complete, transition, care at the end', '火在水上，未济，君子以慎辨物居方。', 'Fire over water: almost there; the last steps need the most care.'],
]

export const HEXAGRAMS: readonly HexagramData[] = ROWS.map(([number, lower, upper, zh, pinyin, en, judgement, kzh, ken, szh, sen]) => ({
  number,
  lower,
  upper,
  name: { zh, pinyin, en },
  judgement,
  keywords: { zh: kzh.split('、'), en: ken.split(', ') },
  sense: { zh: szh, en: sen },
}))

/** Traditional sense of each line position, bottom (1) to top (6). */
export const LINE_POSITIONS: { zh: string; en: string }[] = [
  { zh: '初爻：事情的开端，潜藏未显，宜静观。', en: 'Line 1, the beginning: hidden potential; watch before you move.' },
  { zh: '二爻：得中而柔，与人相应，宜稳步进取。', en: 'Line 2, the centre of the lower trigram: balanced and supported; advance steadily.' },
  { zh: '三爻：下卦之极，多危多虑，宜谨慎。', en: 'Line 3, the top of the lower trigram: a threshold; danger of overreach.' },
  { zh: '四爻：近君之位，进退之间，宜审时度势。', en: 'Line 4, just below the ruler: transition; judge the moment carefully.' },
  { zh: '五爻：尊位，得中得正，宜施展。', en: 'Line 5, the ruling line: authority and clarity; act with confidence.' },
  { zh: '上爻：事情的终局，物极必反，宜知止。', en: 'Line 6, the end: completion turning to excess; know when to stop.' },
]

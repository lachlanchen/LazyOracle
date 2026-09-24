package art.lazying.auspice

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Bilingual(val en: String = "", val zh: String = "")

// MARK: Almanac

@Serializable
data class AlmanacLunar(
    val text: String = "",
    val yearGanZhi: String = "",
    val monthGanZhi: String = "",
    val dayGanZhi: String = "",
    val zodiac: String = ""
)

@Serializable
data class SolarTermRef(val name: String = "", val date: String = "")

@Serializable
data class Mansion(val name: String = "", val animal: String = "", val direction: String = "", val beast: String = "")

@Serializable
data class DaySpirit(val name: String = "", val road: String = "", val luck: String = "")

@Serializable
data class AlmanacHour(val ganzhi: String = "", val range: String = "", val spirit: String = "", val lucky: Boolean = false)

@Serializable
data class ActivityJudgement(
    val activity: String = "",
    val verdict: String = "",
    val matched: String? = null,
    val basis: Bilingual = Bilingual()
)

@Serializable
data class AlmanacDay(
    val date: String = "",
    val lunar: AlmanacLunar = AlmanacLunar(),
    val solarTerm: String? = null,
    val nextSolarTerm: SolarTermRef = SolarTermRef(),
    val yi: List<String> = emptyList(),
    val ji: List<String> = emptyList(),
    val clash: String = "",
    val harmDirection: String = "",
    val dayOfficer: String = "",
    val mansion: Mansion = Mansion(),
    val spirit: DaySpirit = DaySpirit(),
    val auspicious: List<String> = emptyList(),
    val inauspicious: List<String> = emptyList(),
    val pengzu: List<String> = emptyList(),
    val hours: List<AlmanacHour> = emptyList(),
    val standing: String = "",
    val luckyHours: List<AlmanacHour> = emptyList(),
    val judgement: ActivityJudgement? = null
)

@Serializable
data class AlmanacActivity(val id: String = "", val name: Bilingual = Bilingual(), val terms: List<String> = emptyList())

// MARK: Tarot

@Serializable
data class TarotCardText(val name: String = "", val upright: List<String> = emptyList(), val reversed: List<String> = emptyList())

@Serializable
data class TarotTexts(val en: TarotCardText = TarotCardText(), val zh: TarotCardText = TarotCardText())

@Serializable
data class TarotCard(
    val id: String = "",
    val arcana: String = "",
    val number: Int? = null,
    val suit: String? = null,
    val rank: kotlinx.serialization.json.JsonPrimitive? = null,
    val label: String = "",
    val element: String = "",
    val text: TarotTexts = TarotTexts()
)

@Serializable
data class SpreadLayout(val x: Double = 0.0, val y: Double = 0.0, val rotate: Boolean? = null)

@Serializable
data class SpreadPosition(
    val id: String = "",
    val name: Bilingual = Bilingual(),
    val question: Bilingual = Bilingual(),
    val layout: SpreadLayout = SpreadLayout()
)

@Serializable
data class Spread(val id: String = "", val name: Bilingual = Bilingual(), val positions: List<SpreadPosition> = emptyList())

@Serializable
data class DrawnCard(val position: SpreadPosition = SpreadPosition(), val card: TarotCard = TarotCard(), val orientation: String = "upright") {
    val reversed: Boolean get() = orientation == "reversed"
}

@Serializable
data class TarotDraw(
    val spread: Spread = Spread(),
    val seed: Long = 0,
    val cards: List<DrawnCard> = emptyList(),
    val question: String = "",
    val drawnAt: String = ""
)

// MARK: I Ching

@Serializable
data class Trigram(val id: String = "", val name: Bilingual = Bilingual(), val lines: List<Int> = emptyList(), val nature: Bilingual = Bilingual(), val direction: Bilingual = Bilingual())

@Serializable
data class HexagramName(val zh: String = "", val pinyin: String = "", val en: String = "")

@Serializable
data class HexagramKeywords(val zh: List<String> = emptyList(), val en: List<String> = emptyList())

@Serializable
data class Hexagram(
    val number: Int = 0,
    val lower: String = "",
    val upper: String = "",
    val name: HexagramName = HexagramName(),
    val judgement: String = "",
    val keywords: HexagramKeywords = HexagramKeywords(),
    val sense: Bilingual = Bilingual(),
    val lines: List<Int> = emptyList(),
    val lowerTrigram: Trigram = Trigram(),
    val upperTrigram: Trigram = Trigram()
)

@Serializable
data class CastLine(val value: Int = 0, val yang: Boolean = false, val changing: Boolean = false)

@Serializable
data class ReadingFocus(val kind: String = "", val rule: Bilingual = Bilingual(), val from: String = "", val positions: List<Int> = emptyList())

@Serializable
data class IChingCast(
    val method: String = "",
    val seed: Long = 0,
    val question: String = "",
    val castAt: String = "",
    val lines: List<CastLine> = emptyList(),
    val primary: Hexagram = Hexagram(),
    val resulting: Hexagram? = null,
    val changingPositions: List<Int> = emptyList(),
    val nuclear: Hexagram = Hexagram(),
    val opposite: Hexagram = Hexagram(),
    val inverse: Hexagram = Hexagram(),
    val focus: ReadingFocus = ReadingFocus()
)

// MARK: The books

@Serializable
data class BookPage(val number: Int = 0, val en: String = "", val zh: String = "")

@Serializable
data class BookOpening(val book: String = "", val seed: Long = 0, val page: BookPage = BookPage(), val question: String = "", val openedAt: String = "")

// MARK: BaZi

@Serializable
data class HiddenStem(val stem: String = "", val god: String = "")

@Serializable
data class Pillar(
    val stem: String = "",
    val branch: String = "",
    val ganzhi: String = "",
    val stemGod: String = "",
    val hiddenStems: List<HiddenStem> = emptyList(),
    val naYin: String = "",
    val element: String = ""
)

@Serializable
data class Pillars(val year: Pillar = Pillar(), val month: Pillar = Pillar(), val day: Pillar = Pillar(), val hour: Pillar = Pillar())

@Serializable
data class DayMaster(val stem: String = "", val element: String = "", val yinYang: String = "")

@Serializable
data class BaziLunar(val text: String = "", val jieQiBefore: String = "", val jieQiAfter: String = "")

@Serializable
data class LuckCycle(val ganzhi: String = "", val startYear: Int = 0, val endYear: Int = 0, val startAge: Int = 0)

@Serializable
data class LuckStart(val years: Int = 0, val months: Int = 0)

@Serializable
data class CurrentYear(val year: Int = 0, val ganzhi: String = "", val god: String = "")

@Serializable
data class BaziChart(
    val solarCorrectionMinutes: Double = 0.0,
    val pillars: Pillars = Pillars(),
    val dayMaster: DayMaster = DayMaster(),
    val elements: Map<String, Double> = emptyMap(),
    val strength: String = "",
    val favourable: List<String> = emptyList(),
    val lunar: BaziLunar = BaziLunar(),
    val luckCycles: List<LuckCycle> = emptyList(),
    val luckStart: LuckStart = LuckStart(),
    val currentYear: CurrentYear = CurrentYear()
)

// MARK: Astrology

@Serializable
data class Placement(
    val body: String = "",
    val longitude: Double = 0.0,
    val sign: Int = 0,
    val degree: Double = 0.0,
    val house: Int = 0,
    val retrograde: Boolean = false
)

@Serializable
data class Aspect(val a: String = "", val b: String = "", val type: String = "", val orb: Double = 0.0)

@Serializable
data class NatalChart(
    val instant: String = "",
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val ascendant: Double = 0.0,
    val midheaven: Double = 0.0,
    val ascendantSign: Int = 0,
    val placements: List<Placement> = emptyList(),
    val aspects: List<Aspect> = emptyList(),
    val moonPhase: Double = 0.0
)

@Serializable
data class Transit(val transiting: String = "", val natal: String = "", val type: String = "", val orb: Double = 0.0)

@Serializable
data class TransitReport(val positions: List<Placement> = emptyList(), val transits: List<Transit> = emptyList())

object Zodiac {
    val signs = listOf(
        Triple("Aries", "白羊座", "♈"), Triple("Taurus", "金牛座", "♉"), Triple("Gemini", "双子座", "♊"),
        Triple("Cancer", "巨蟹座", "♋"), Triple("Leo", "狮子座", "♌"), Triple("Virgo", "处女座", "♍"),
        Triple("Libra", "天秤座", "♎"), Triple("Scorpio", "天蝎座", "♏"), Triple("Sagittarius", "射手座", "♐"),
        Triple("Capricorn", "摩羯座", "♑"), Triple("Aquarius", "水瓶座", "♒"), Triple("Pisces", "双鱼座", "♓")
    )
    val bodySymbols = mapOf(
        "Sun" to "☉", "Moon" to "☽", "Mercury" to "☿", "Venus" to "♀", "Mars" to "♂",
        "Jupiter" to "♃", "Saturn" to "♄", "Uranus" to "♅", "Neptune" to "♆", "Pluto" to "♇"
    )
}

// MARK: Feng shui

@Serializable
data class SectorQuality(val id: String = "", val name: Bilingual = Bilingual(), val auspicious: Boolean = false, val use: Bilingual = Bilingual())

@Serializable
data class MansionSector(val direction: String = "", val quality: SectorQuality = SectorQuality())

@Serializable
data class EightMansions(
    val year: Int = 0,
    val guaNumber: Int = 0,
    val gua: String = "",
    val group: String = "",
    val sectors: List<MansionSector> = emptyList(),
    val best: String = "",
    val worst: String = ""
)

// MARK: Palmistry and face reading

@Serializable
data class FingerTrait(val finger: String = "", val ratioToSaturn: Double = 0.0, val length: String = "")

@Serializable
data class PalaceReading(val palace: String = "", val prominence: Double = 0.0, val state: String = "")

@Serializable
data class LineTraits(
    val heart: String = "unsure",
    val head: String = "unsure",
    val life: String = "unsure",
    val fate: String = "unsure"
)

@Serializable
data class PalmFeatures(
    val shape: String = "",
    val palmLength: Double = 0.0,
    val palmWidth: Double = 0.0,
    val fingerLength: Double = 0.0,
    val fingerRatio: Double = 0.0,
    val palmRatio: Double = 0.0,
    val indexToRing: Double = 0.0,
    val thumbSpread: Double = 0.0,
    val thumbAngle: Double = 0.0,
    val openness: Double = 0.0,
    val fingers: List<FingerTrait> = emptyList(),
    val palaces: List<PalaceReading> = emptyList(),
    val strongPalaces: List<String> = emptyList(),
    val lines: LineTraits = LineTraits(),
    val measurement: VisionMeasurement? = null
)

@Serializable
data class Court(val court: String = "", val share: Double = 0.0, val state: String = "")

@Serializable
data class FacePalaceReading(val palace: String = "", val value: Double = 0.0, val state: String = "")

@Serializable
data class FaceFeatures(
    val element: String = "",
    val courts: List<Court> = emptyList(),
    val eyesAcross: Double = 0.0,
    val eyeGap: Double = 0.0,
    val heightRatio: Double = 0.0,
    val jawRatio: Double = 0.0,
    val foreheadRatio: Double = 0.0,
    val symmetry: Double = 0.0,
    val palaces: List<FacePalaceReading> = emptyList(),
    val strongPalaces: List<String> = emptyList(),
    val measurement: VisionMeasurement? = null
)

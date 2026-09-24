import Foundation

/// The app speaks English and Simplified Chinese, and so do the rules: almost
/// every label the engines return carries both.
struct Bilingual: Codable, Hashable {
    let en: String
    let zh: String
}

// MARK: - Tarot

struct TarotCardText: Codable {
    let name: String
    let upright: [String]
    let reversed: [String]
}

/// Number cards use JSON numbers; aces and court cards use strings.
enum TarotRank: Codable {
    case number(Int)
    case named(String)
    init(from decoder: Decoder) throws {
        let value = try decoder.singleValueContainer()
        if let number = try? value.decode(Int.self) { self = .number(number) }
        else { self = .named(try value.decode(String.self)) }
    }
    func encode(to encoder: Encoder) throws {
        var value = encoder.singleValueContainer()
        switch self {
        case .number(let rank): try value.encode(rank)
        case .named(let rank): try value.encode(rank)
        }
    }
}

struct TarotCard: Codable {
    struct Texts: Codable {
        let en: TarotCardText
        let zh: TarotCardText
    }
    let id: String
    let arcana: String
    let number: Int?
    let suit: String?
    let rank: TarotRank?
    let label: String
    let element: String
    let text: Texts
}

struct SpreadPosition: Codable, Identifiable, Hashable {
    struct Layout: Codable, Hashable {
        let x: Double
        let y: Double
        let rotate: Bool?
    }
    let id: String
    let name: Bilingual
    let question: Bilingual
    let layout: Layout

    static func == (lhs: SpreadPosition, rhs: SpreadPosition) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct Spread: Codable, Identifiable {
    let id: String
    let name: Bilingual
    let positions: [SpreadPosition]
}

struct DrawnCard: Codable, Identifiable {
    let position: SpreadPosition
    let card: TarotCard
    let orientation: String
    var id: String { position.id }
    var reversed: Bool { orientation == "reversed" }
}

struct TarotDraw: Codable {
    let spread: Spread
    let seed: Int
    let cards: [DrawnCard]
    let question: String
    let drawnAt: String
}

// MARK: - I Ching

struct Trigram: Codable {
    let id: String
    let name: Bilingual
    let lines: [Int]
    let nature: Bilingual
    let direction: Bilingual
}

struct HexagramName: Codable {
    let zh: String
    let pinyin: String
    let en: String
}

struct Hexagram: Codable {
    struct Keywords: Codable {
        let zh: [String]
        let en: [String]
    }
    let number: Int
    let lower: String
    let upper: String
    let name: HexagramName
    let judgement: String
    let keywords: Keywords
    let sense: Bilingual
    let lines: [Int]
    let lowerTrigram: Trigram
    let upperTrigram: Trigram
}

struct CastLine: Codable, Identifiable {
    let value: Int
    let yang: Bool
    let changing: Bool
    let coins: [Bool]?
    var id: Int { value &* 31 &+ (yang ? 1 : 0) }
}

struct ReadingFocus: Codable {
    let kind: String
    let rule: Bilingual
    let from: String
    let positions: [Int]
}

struct IChingCast: Codable {
    let method: String
    let seed: Int
    let question: String
    let castAt: String
    let lines: [CastLine]
    let primary: Hexagram
    let resulting: Hexagram?
    let changingPositions: [Int]
    let nuclear: Hexagram
    let opposite: Hexagram
    let inverse: Hexagram
    let focus: ReadingFocus
}

// MARK: - The books

struct BookPage: Codable {
    let number: Int
    let en: String
    let zh: String
}

struct BookOpening: Codable {
    let book: String
    let seed: Int
    let page: BookPage
    let question: String
    let openedAt: String
}

// MARK: - BaZi

struct Pillar: Codable {
    struct Hidden: Codable, Identifiable {
        let stem: String
        let god: String
        var id: String { stem + god }
    }
    let stem: String
    let branch: String
    let ganzhi: String
    let stemGod: String
    let hiddenStems: [Hidden]
    let naYin: String
    let element: String
}

struct LuckCycle: Codable, Identifiable {
    let ganzhi: String
    let startYear: Int
    let endYear: Int
    let startAge: Int
    var id: Int { startYear }
}

struct BaziChart: Codable {
    struct Pillars: Codable {
        let year: Pillar
        let month: Pillar
        let day: Pillar
        let hour: Pillar
    }
    struct DayMaster: Codable {
        let stem: String
        let element: String
        let yinYang: String
    }
    struct Lunar: Codable {
        let text: String
        let jieQiBefore: String
        let jieQiAfter: String
    }
    struct LuckStart: Codable {
        let years: Int
        let months: Int
    }
    struct CurrentYear: Codable {
        let year: Int
        let ganzhi: String
        let god: String
    }
    let solarCorrectionMinutes: Double
    let pillars: Pillars
    let dayMaster: DayMaster
    let elements: [String: Double]
    let strength: String
    let favourable: [String]
    let lunar: Lunar
    let luckCycles: [LuckCycle]
    let luckStart: LuckStart
    let currentYear: CurrentYear
}

// MARK: - Astrology

struct Placement: Codable, Identifiable {
    let body: String
    let longitude: Double
    let sign: Int
    let degree: Double
    let house: Int
    let retrograde: Bool
    var id: String { body }
}

struct Aspect: Codable, Identifiable {
    let a: String
    let b: String
    let type: String
    let orb: Double
    var id: String { a + b + type }
}

struct NatalChart: Codable {
    let instant: String
    let latitude: Double
    let longitude: Double
    let ascendant: Double
    let midheaven: Double
    let ascendantSign: Int
    let placements: [Placement]
    let aspects: [Aspect]
    let moonPhase: Double
}

struct Transit: Codable, Identifiable {
    let transiting: String
    let natal: String
    let type: String
    let orb: Double
    var id: String { transiting + natal + type }
}

struct TransitReport: Codable {
    let positions: [Placement]
    let transits: [Transit]
}

/// The twelve signs. Fixed astronomy, not a rule the engines decide, so the
/// labels live here rather than crossing the bridge on every draw.
enum Zodiac {
    static let signs: [(en: String, zh: String, symbol: String, element: String)] = [
        ("Aries", "白羊座", "♈", "fire"),
        ("Taurus", "金牛座", "♉", "earth"),
        ("Gemini", "双子座", "♊", "air"),
        ("Cancer", "巨蟹座", "♋", "water"),
        ("Leo", "狮子座", "♌", "fire"),
        ("Virgo", "处女座", "♍", "earth"),
        ("Libra", "天秤座", "♎", "air"),
        ("Scorpio", "天蝎座", "♏", "water"),
        ("Sagittarius", "射手座", "♐", "fire"),
        ("Capricorn", "摩羯座", "♑", "earth"),
        ("Aquarius", "水瓶座", "♒", "air"),
        ("Pisces", "双鱼座", "♓", "water")
    ]

    static let bodySymbols: [String: String] = [
        "Sun": "☉", "Moon": "☽", "Mercury": "☿", "Venus": "♀", "Mars": "♂",
        "Jupiter": "♃", "Saturn": "♄", "Uranus": "♅", "Neptune": "♆", "Pluto": "♇"
    ]

    static func aspectColour(_ type: String) -> String { type }
}

// MARK: - Feng shui

struct SectorQuality: Codable {
    let id: String
    let name: Bilingual
    let auspicious: Bool
    let use: Bilingual
}

struct MansionSector: Codable, Identifiable {
    let direction: String
    let quality: SectorQuality
    var id: String { direction }
}

struct EightMansions: Codable {
    let year: Int
    let guaNumber: Int
    let gua: String
    let group: String
    let sectors: [MansionSector]
    let best: String
    let worst: String
}

// MARK: - Palmistry

struct FingerTrait: Codable, Identifiable {
    let finger: String
    let ratioToSaturn: Double
    let length: String
    var id: String { finger }
}

struct PalaceReading: Codable, Identifiable {
    let palace: String
    let prominence: Double
    let state: String
    var id: String { palace }
}

struct LineTraits: Codable {
    var heart = "between"
    var head = "curved"
    var life = "wide"
    var fate = "unsure"

    var dictionary: [String: Any] { ["heart": heart, "head": head, "life": life, "fate": fate] }
}

struct PalmFeatures: Codable {
    let shape: String
    let palmLength: Double
    let palmWidth: Double
    let fingerLength: Double
    let fingerRatio: Double
    let palmRatio: Double
    let indexToRing: Double
    let thumbSpread: Double
    let thumbAngle: Double
    let openness: Double
    let fingers: [FingerTrait]
    let palaces: [PalaceReading]
    let strongPalaces: [String]
    let lines: LineTraits
}

// MARK: - Face reading

struct Court: Codable, Identifiable {
    let court: String
    let share: Double
    let state: String
    var id: String { court }
}

struct FacePalaceReading: Codable, Identifiable {
    let palace: String
    let value: Double
    let state: String
    var id: String { palace }
}

struct FaceFeatures: Codable {
    let element: String
    let courts: [Court]
    let eyesAcross: Double
    let eyeGap: Double
    let heightRatio: Double
    let jawRatio: Double
    let foreheadRatio: Double
    let symmetry: Double
    let palaces: [FacePalaceReading]
    let strongPalaces: [String]
}

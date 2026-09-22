import Foundation

/// The app speaks English and Simplified Chinese, and so do the rules: almost
/// every label the engines return carries both.
struct Bilingual: Decodable, Hashable {
    let en: String
    let zh: String
}

// MARK: - Tarot

struct TarotCardText: Decodable {
    let name: String
    let upright: [String]
    let reversed: [String]
}

struct TarotCard: Decodable {
    struct Texts: Decodable {
        let en: TarotCardText
        let zh: TarotCardText
    }
    let id: String
    let arcana: String
    let number: Int?
    let suit: String?
    let rank: String?
    let label: String
    let element: String
    let text: Texts
}

struct SpreadPosition: Decodable, Identifiable, Hashable {
    struct Layout: Decodable, Hashable {
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

struct Spread: Decodable, Identifiable {
    let id: String
    let name: Bilingual
    let positions: [SpreadPosition]
}

struct DrawnCard: Decodable, Identifiable {
    let position: SpreadPosition
    let card: TarotCard
    let orientation: String
    var id: String { position.id }
    var reversed: Bool { orientation == "reversed" }
}

struct TarotDraw: Decodable {
    let spread: Spread
    let seed: Int
    let cards: [DrawnCard]
    let question: String
    let drawnAt: String
}

// MARK: - I Ching

struct Trigram: Decodable {
    let id: String
    let name: Bilingual
    let lines: [Int]
    let nature: Bilingual
    let direction: Bilingual
}

struct HexagramName: Decodable {
    let zh: String
    let pinyin: String
    let en: String
}

struct Hexagram: Decodable {
    struct Keywords: Decodable {
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

struct CastLine: Decodable, Identifiable {
    let value: Int
    let yang: Bool
    let changing: Bool
    let coins: [Bool]?
    var id: Int { value &* 31 &+ (yang ? 1 : 0) }
}

struct ReadingFocus: Decodable {
    let kind: String
    let explain: Bilingual?
    let positions: [Int]?
}

struct IChingCast: Decodable {
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

struct BookPage: Decodable {
    let number: Int
    let en: String
    let zh: String
}

struct BookOpening: Decodable {
    let book: String
    let seed: Int
    let page: BookPage
    let question: String
    let openedAt: String
}

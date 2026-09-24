import SwiftUI

/// The interface language, and the one function that looks a string up.
///
/// The app follows the phone unless the reader chooses otherwise in Settings,
/// and a choice takes effect at once rather than on the next launch — which is
/// why the strings live in a table here rather than in `.lproj` bundles.
///
@Observable
final class Localisation {
    static let shared = Localisation()
    private static let key = "auspice.language"

    /// nil means "follow the phone".
    var chosen: String? {
        didSet {
            if let chosen {
                UserDefaults.standard.set(chosen, forKey: Self.key)
            } else {
                UserDefaults.standard.removeObject(forKey: Self.key)
            }
        }
    }

    private init() {
        chosen = UserDefaults.standard.string(forKey: Self.key)
    }

    /// The language actually in use: the chosen one, or the closest the phone
    /// asks for, or English.
    var code: String {
        if let chosen, Catalogue.table.values.first?[chosen] != nil { return chosen }
        return Self.match(Locale.preferredLanguages)
    }

    var layoutDirection: LayoutDirection {
        Catalogue.rightToLeft.contains(code) ? .rightToLeft : .leftToRight
    }

    /// Chinese needs care: a phone set to zh-TW or zh-HK wants the traditional
    /// text, and everything else zh wants the simplified one.
    static func match(_ preferred: [String]) -> String {
        let available = Catalogue.languages.map(\.code)
        for tag in preferred {
            let lower = tag.lowercased()
            if lower.hasPrefix("zh") {
                let traditional = ["hant", "tw", "hk", "mo"].contains { lower.contains($0) }
                return traditional ? "zh-Hant" : "zh-Hans"
            }
            if let exact = available.first(where: { $0.lowercased() == lower }) { return exact }
            let base = lower.split(separator: "-").first.map(String.init) ?? lower
            if let loose = available.first(where: { $0.lowercased() == base }) { return loose }
        }
        return "en"
    }
}

/// Look a string up in the language in force. A missing key shows itself
/// rather than an empty space, so a gap is obvious the first time it is seen.
func t(_ key: String) -> String {
    Catalogue.table[key]?[Localisation.shared.code] ?? Catalogue.table[key]?["en"] ?? key
}

/// Engine text is translated only for presentation. Identifiers and facts
/// sent back to the engines are never changed.
private enum ReadingCatalogue {
    static let values: [String: [String: String]] = {
        guard let url = Bundle.main.url(forResource: "auspice-content", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let values = try? JSONDecoder().decode([String: [String: String]].self, from: data) else { return [:] }
        return values
    }()
}

func l(_ source: String) -> String {
    let code = Localisation.shared.code
    if let translated = ReadingCatalogue.values[source]?[code] { return translated }
    if let translated = Catalogue.glossary[source]?[code] { return translated }
    // Lists of engine terms keep their order and receive no extra meanings.
    for separator in [" · ", "、", " / "] where source.contains(separator) {
        return source.components(separatedBy: separator).map(l).joined(separator: " · ")
    }
    return source
}

func lf(_ template: String, _ values: String...) -> String {
    var result = l(template)
    for (index, value) in values.enumerated() {
        result = result.replacingOccurrences(of: "{\(index)}", with: l(value))
    }
    return result
}

func glossed(_ term: String) -> String { l(term) }

func lunarDateText(_ source: String) -> String {
    if Localisation.shared.code.hasPrefix("zh") {
        return Localisation.shared.code == "zh-Hant" ? source.replacingOccurrences(of: "闰", with: "閏").replacingOccurrences(of: "腊", with: "臘") : source
    }
    let digits: [Character: String] = ["〇":"0", "零":"0", "一":"1", "二":"2", "三":"3", "四":"4", "五":"5", "六":"6", "七":"7", "八":"8", "九":"9"]
    func number(_ text: String) -> String {
        if text == "正" { return "1" }; if text == "冬" { return "11" }; if text == "腊" { return "12" }
        let cleaned = text.replacingOccurrences(of: "初", with: "").replacingOccurrences(of: "廿", with: "二十").replacingOccurrences(of: "卅", with: "三十")
        if cleaned.contains("十") {
            let parts = cleaned.components(separatedBy: "十")
            let tens = parts[0].first.flatMap { digits[$0] }.flatMap(Int.init) ?? 1
            let ones = parts.last?.first.flatMap { digits[$0] }.flatMap(Int.init) ?? 0
            return String(tens * 10 + ones)
        }
        return cleaned.map { digits[$0] ?? String($0) }.joined()
    }
    let parts = source.components(separatedBy: CharacterSet(charactersIn: "年月日")).filter { !$0.isEmpty }
    guard parts.count == 3 else { return l(source) }
    let leap = parts[1].contains("闰")
    let date = parts.enumerated().map { number($0.element.replacingOccurrences(of: "闰", with: "")) }.joined(separator: "-")
    return lf(leap ? "Lunar date: {0} (leap month)" : "Lunar date: {0}", date)
}

/// The selected language leads; an occasional traditional term is fine.
func readingLanguageInstruction() -> String {
    "Write mainly in the selected app language: \(Localisation.shared.code). Use clear everyday language. Traditional Chinese uses Traditional characters; Simplified Chinese uses Simplified characters. Brief conventional terms from another language are allowed when useful, but do not alternate languages, duplicate paragraphs in translation, or follow the language of raw engine data. Explain unfamiliar terms once. If the reader explicitly requests a different response language, honor that request."
}

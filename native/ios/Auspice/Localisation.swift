import SwiftUI

/// The interface language, and the one function that looks a string up.
///
/// The app follows the phone unless the reader chooses otherwise in Settings,
/// and a choice takes effect at once rather than on the next launch — which is
/// why the strings live in a table here rather than in `.lproj` bundles.
///
/// What is *not* translated: the traditions' own vocabulary. 宜 stays 宜 in
/// every language, as do 忌, 日主, 甲子 and 生气, because they are the subject
/// of the reading rather than part of the interface, and a reader who looks one
/// up in a book will not find it under "suitable".
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

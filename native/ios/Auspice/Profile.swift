import Foundation
import SwiftUI

/// The birth details the charted practices need.
///
/// Stored in `UserDefaults` on this device and nowhere else. The web app keeps
/// the same shape in `localStorage`, so a person moving between the two types
/// it once per device rather than learning a new form.
struct BirthProfile: Codable, Equatable {
    var name = ""
    var year = 1990
    var month = 6
    var day = 15
    var hour = 8
    var minute = 30
    var timeKnown = true
    var gender = "female"
    var place = ""
    var latitude = 31.23
    var longitude = 121.47
    var utcOffsetHours = 8.0

    var isComplete: Bool { year > 1800 && !place.isEmpty }

    /// The dictionary the engines expect.
    var engineInput: [String: Any] {
        [
            "name": name,
            "year": year, "month": month, "day": day,
            "hour": hour, "minute": minute,
            "timeKnown": timeKnown,
            "gender": gender,
            "place": place,
            "latitude": latitude, "longitude": longitude,
            "utcOffsetHours": utcOffsetHours
        ]
    }
}

@Observable
final class ProfileStore {
    static let shared = ProfileStore()
    private static let key = "auspice.profile"

    var profile: BirthProfile {
        didSet { save() }
    }

    private init() {
        if let data = UserDefaults.standard.data(forKey: Self.key),
           let decoded = try? JSONDecoder().decode(BirthProfile.self, from: data) {
            profile = decoded
        } else {
            profile = BirthProfile()
        }
    }

    private func save() {
        if let data = try? JSONEncoder().encode(profile) {
            UserDefaults.standard.set(data, forKey: Self.key)
        }
    }
}

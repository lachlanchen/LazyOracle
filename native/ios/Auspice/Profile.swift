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

/// The line at the top of a charted screen: who this chart is for, and a way
/// to change it.
struct BirthSummary: View {
    let profile: BirthProfile
    let edit: () -> Void

    var body: some View {
        Button(action: edit) {
            Panel {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(profile.isComplete ? summary : "Add your birth details")
                            .font(Typeface.display(17))
                            .foregroundStyle(Palette.ink)
                            .multilineTextAlignment(.leading)
                        Text(profile.isComplete
                             ? (profile.timeKnown ? "\(profile.place) · time known" : "\(profile.place) · time unknown")
                             : "The hour matters: without it a pillar is missing.")
                            .font(Typeface.serif(15))
                            .foregroundStyle(Palette.inkMute)
                            .multilineTextAlignment(.leading)
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "pencil.circle")
                        .font(.system(size: 22))
                        .foregroundStyle(Palette.gold)
                }
            }
        }
        .buttonStyle(.plain)
    }

    private var summary: String {
        let time = profile.timeKnown ? String(format: " %02d:%02d", profile.hour, profile.minute) : ""
        return String(format: "%d-%02d-%02d%@", profile.year, profile.month, profile.day, time)
    }
}

/// The form itself. Everything on it stays on the device.
struct BirthForm: View {
    @Binding var profile: BirthProfile
    let done: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var draft = BirthProfile()

    var body: some View {
        NavigationStack {
            ZStack {
                Sky()
                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        Panel(title: "Born") {
                            DatePicker(
                                "Date and time",
                                selection: Binding(
                                    get: { date(from: draft) },
                                    set: { apply($0) }
                                ),
                                displayedComponents: draft.timeKnown ? [.date, .hourAndMinute] : [.date]
                            )
                            .datePickerStyle(.compact)
                            .foregroundStyle(Palette.inkSoft)
                            .font(Typeface.sans(16))
                            Toggle("I know the hour", isOn: $draft.timeKnown)
                                .font(Typeface.sans(16))
                                .foregroundStyle(Palette.inkSoft)
                                .tint(Palette.gold)
                        }

                        Panel(title: "Where") {
                            FieldLabel("Place")
                            TextField("", text: $draft.place)
                                .textFieldStyle(AuspiceFieldStyle())
                            HStack(spacing: 10) {
                                numberField("Latitude", value: $draft.latitude)
                                numberField("Longitude", value: $draft.longitude)
                            }
                            numberField("Hours from UTC", value: $draft.utcOffsetHours)
                            Text("Longitude and the offset give true solar time, which is what the hour pillar is taken from.")
                                .font(Typeface.sans(13))
                                .foregroundStyle(Palette.inkMute)
                                .fixedSize(horizontal: false, vertical: true)
                        }

                        Panel(title: "Who") {
                            FieldLabel("Name, if you want it on the chart")
                            TextField("", text: $draft.name)
                                .textFieldStyle(AuspiceFieldStyle())
                            FlowRow(spacing: 8) {
                                Chip(label: "Female", detail: "女", active: draft.gender == "female") { draft.gender = "female" }
                                Chip(label: "Male", detail: "男", active: draft.gender == "male") { draft.gender = "male" }
                            }
                            Text("The eight mansions and the direction of the luck cycles are counted differently for each; the practices ask for it, so the app does too.")
                                .font(Typeface.sans(13))
                                .foregroundStyle(Palette.inkMute)
                                .fixedSize(horizontal: false, vertical: true)
                        }

                        Button("Save") {
                            profile = draft
                            done()
                            dismiss()
                        }
                        .buttonStyle(PrimaryButtonStyle())
                    }
                    .padding(18)
                    .frame(maxWidth: 560)
                    .frame(maxWidth: .infinity)
                }
            }
            .navigationTitle("Birth details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.foregroundStyle(Palette.inkSoft)
                }
            }
        }
        .onAppear { draft = profile }
    }

    private func numberField(_ label: String, value: Binding<Double>) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            FieldLabel(label)
            TextField("", value: value, format: .number)
                .keyboardType(.numbersAndPunctuation)
                .textFieldStyle(AuspiceFieldStyle())
        }
    }

    private func date(from profile: BirthProfile) -> Date {
        var components = DateComponents()
        components.year = profile.year
        components.month = profile.month
        components.day = profile.day
        components.hour = profile.hour
        components.minute = profile.minute
        return Calendar(identifier: .gregorian).date(from: components) ?? Date()
    }

    private func apply(_ date: Date) {
        let parts = Calendar(identifier: .gregorian).dateComponents(
            [.year, .month, .day, .hour, .minute], from: date
        )
        draft.year = parts.year ?? draft.year
        draft.month = parts.month ?? draft.month
        draft.day = parts.day ?? draft.day
        draft.hour = parts.hour ?? draft.hour
        draft.minute = parts.minute ?? draft.minute
    }
}

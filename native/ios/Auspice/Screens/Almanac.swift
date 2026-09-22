import SwiftUI

// MARK: - What the rules hand back

struct AlmanacDay: Decodable {
    struct Lunar: Decodable {
        let text: String
        let yearGanZhi: String
        let monthGanZhi: String
        let dayGanZhi: String
        let zodiac: String
    }

    struct SolarTermRef: Decodable {
        let name: String
        let date: String
    }

    struct Mansion: Decodable {
        let name: String
        let animal: String
        let direction: String
        let beast: String
    }

    struct Spirit: Decodable {
        let name: String
        let road: String
        let luck: String
    }

    struct Hour: Decodable, Identifiable {
        let ganzhi: String
        let range: String
        let spirit: String
        let lucky: Bool
        var id: String { ganzhi + range }
    }

    struct Judgement: Decodable {
        struct Basis: Decodable {
            let zh: String
            let en: String
        }
        let activity: String
        let verdict: String
        let matched: String?
        let basis: Basis
    }

    let date: String
    let lunar: Lunar
    let solarTerm: String?
    let nextSolarTerm: SolarTermRef
    let yi: [String]
    let ji: [String]
    let clash: String
    let harmDirection: String
    let dayOfficer: String
    let mansion: Mansion
    let spirit: Spirit
    let auspicious: [String]
    let inauspicious: [String]
    let pengzu: [String]
    let hours: [Hour]
    let standing: String
    let luckyHours: [Hour]
    let judgement: Judgement?
}

struct AlmanacActivity: Decodable, Identifiable {
    struct Name: Decodable {
        let zh: String
        let en: String
    }
    let id: String
    let name: Name
    let terms: [String]
}

/// Loads a day, and the list of undertakings, from the shared rules.
@Observable
final class AlmanacStore {
    var day: AlmanacDay?
    var activities: [AlmanacActivity] = []
    var activity: String?
    var date = Date()
    var error: String?

    private static let iso: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.calendar = Calendar(identifier: .gregorian)
        return formatter
    }()

    func load() {
        do {
            if activities.isEmpty {
                activities = try Engines.shared.evaluate("almanac.activities", as: [AlmanacActivity].self)
            }
            var input: [String: Any] = ["date": Self.iso.string(from: date)]
            if let activity { input["activity"] = activity }
            day = try Engines.shared.evaluate("almanac.day", input, as: AlmanacDay.self)
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    func shift(_ days: Int) {
        date = Calendar.current.date(byAdding: .day, value: days, to: date) ?? date
        load()
    }
}

// MARK: - The screen

struct AlmanacScreen: View {
    @State private var store = AlmanacStore()

    var body: some View {
        ScreenScaffold(
            eyebrow: "黄历 · Almanac",
            title: "What today suits",
            tagline: "The old tables, read for a single day."
        ) {
            dayPicker
            if let error = store.error {
                Panel(title: "Not computed") {
                    Text(error).font(Typeface.serif(16)).foregroundStyle(Palette.inkSoft)
                }
            }
            if let day = store.day {
                standingPanel(day)
                activityPanel(day)
                listsPanel(day)
                hoursPanel(day)
                tablesPanel(day)
            }
        }
        .onAppear { if store.day == nil { store.load() } }
    }

    private var dayPicker: some View {
        HStack {
            Button { store.shift(-1) } label: {
                Image(systemName: "chevron.left").frame(width: 44, height: 44)
            }
            .foregroundStyle(Palette.inkSoft)
            Spacer()
            VStack(spacing: 2) {
                Text(store.date, format: .dateTime.weekday(.wide).day().month(.wide))
                    .font(Typeface.display(18))
                    .foregroundStyle(Palette.ink)
                if let lunar = store.day?.lunar.text {
                    Text(lunar).font(Typeface.serif(15)).foregroundStyle(Palette.inkMute)
                }
            }
            Spacer()
            Button { store.shift(1) } label: {
                Image(systemName: "chevron.right").frame(width: 44, height: 44)
            }
            .foregroundStyle(Palette.inkSoft)
        }
        .padding(.vertical, 2)
    }

    private func standingPanel(_ day: AlmanacDay) -> some View {
        Panel {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(standingWord(day.standing))
                    .font(Typeface.display(26))
                    .foregroundStyle(standingColour(day.standing))
                Text(day.lunar.dayGanZhi + "日")
                    .font(Typeface.serif(18))
                    .foregroundStyle(Palette.inkSoft)
                Spacer()
                Text(day.dayOfficer + "日")
                    .font(Typeface.sans(13, weight: .bold))
                    .foregroundStyle(Palette.gold)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Capsule().fill(Palette.goldSoft))
            }
            Text(standingLine(day))
                .font(Typeface.serif(17))
                .foregroundStyle(Palette.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func activityPanel(_ day: AlmanacDay) -> some View {
        Panel(title: "Can I do it today") {
            FlowRow(spacing: 8) {
                ForEach(store.activities) { item in
                    Button {
                        store.activity = store.activity == item.id ? nil : item.id
                        store.load()
                    } label: {
                        HStack(spacing: 6) {
                            Text(item.name.en)
                            Text(item.name.zh).foregroundStyle(Palette.inkMute)
                        }
                        .font(Typeface.sans(14, weight: .semibold))
                        .padding(.horizontal, 14)
                        .frame(minHeight: 40)
                        .foregroundStyle(store.activity == item.id ? Palette.ink : Palette.inkSoft)
                        .background(
                            Capsule().fill(store.activity == item.id ? Palette.goldSoft : Color.white.opacity(0.04))
                        )
                        .overlay(
                            Capsule().strokeBorder(
                                store.activity == item.id ? Palette.goldLine : Palette.line,
                                lineWidth: 1
                            )
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            if let judgement = day.judgement {
                VStack(alignment: .leading, spacing: 6) {
                    Text(verdictWord(judgement.verdict))
                        .font(Typeface.display(22))
                        .foregroundStyle(verdictColour(judgement.verdict))
                    Text(judgement.basis.en)
                        .font(Typeface.serif(17))
                        .foregroundStyle(Palette.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(judgement.basis.zh)
                        .font(Typeface.serif(16))
                        .foregroundStyle(Palette.inkMute)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.top, 4)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .animation(.easeOut(duration: 0.25), value: store.activity)
    }

    private func listsPanel(_ day: AlmanacDay) -> some View {
        Panel {
            HStack(alignment: .top, spacing: 14) {
                termColumn("宜", "Suits", day.yi, Palette.gold)
                Divider().overlay(Palette.line)
                termColumn("忌", "Avoid", day.ji, Palette.rose)
            }
        }
    }

    private func termColumn(_ mark: String, _ label: String, _ terms: [String], _ colour: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text(mark)
                    .font(Typeface.display(20))
                    .foregroundStyle(colour)
                Text(label.uppercased())
                    .font(Typeface.sans(11, weight: .bold))
                    .tracking(1.8)
                    .foregroundStyle(Palette.inkMute)
            }
            ForEach(terms.isEmpty ? ["—"] : terms, id: \.self) { term in
                Text(term)
                    .font(Typeface.serif(17))
                    .foregroundStyle(Palette.inkSoft)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func hoursPanel(_ day: AlmanacDay) -> some View {
        Panel(title: "Hours") {
            VStack(spacing: 0) {
                ForEach(day.hours) { hour in
                    HStack(spacing: 10) {
                        Text(hour.ganzhi)
                            .font(Typeface.display(16))
                            .foregroundStyle(hour.lucky ? Palette.gold : Palette.inkMute)
                            .frame(width: 44, alignment: .leading)
                        Text(hour.range)
                            .font(Typeface.sans(14))
                            .foregroundStyle(Palette.inkSoft)
                            .frame(width: 104, alignment: .leading)
                        Text(hour.spirit)
                            .font(Typeface.serif(16))
                            .foregroundStyle(Palette.inkSoft)
                        Spacer()
                        Image(systemName: hour.lucky ? "sun.max.fill" : "moon")
                            .font(.system(size: 12))
                            .foregroundStyle(hour.lucky ? Palette.gold : Palette.inkMute.opacity(0.6))
                    }
                    .padding(.vertical, 7)
                    if hour.id != day.hours.last?.id {
                        Divider().overlay(Palette.line)
                    }
                }
            }
        }
    }

    private func tablesPanel(_ day: AlmanacDay) -> some View {
        Panel(title: "The tables") {
            row("干支", "\(day.lunar.yearGanZhi)年 \(day.lunar.monthGanZhi)月 \(day.lunar.dayGanZhi)日 · 属\(day.lunar.zodiac)")
            row("建除", "\(day.dayOfficer)日")
            row("二十八宿", "\(day.mansion.name)\(day.mansion.animal) · \(day.mansion.direction)方\(day.mansion.beast)")
            row("值日", "\(day.spirit.name) · \(day.spirit.road) · \(day.spirit.luck)")
            row("冲煞", "冲\(day.clash) · 煞\(day.harmDirection)")
            if let term = day.solarTerm {
                row("节气", term)
            } else {
                row("下一节气", "\(day.nextSolarTerm.name) · \(day.nextSolarTerm.date)")
            }
            if !day.auspicious.isEmpty { row("吉神", day.auspicious.joined(separator: " ")) }
            if !day.inauspicious.isEmpty { row("凶煞", day.inauspicious.joined(separator: " ")) }
            if !day.pengzu.isEmpty { row("彭祖百忌", day.pengzu.joined(separator: "，")) }
        }
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(label)
                .font(Typeface.sans(12, weight: .bold))
                .tracking(1.4)
                .foregroundStyle(Palette.inkMute)
                .frame(width: 76, alignment: .leading)
            Text(value)
                .font(Typeface.serif(16))
                .foregroundStyle(Palette.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .padding(.vertical, 4)
    }

    private func standingWord(_ standing: String) -> String {
        switch standing {
        case "auspicious": "A yellow-road day"
        case "inauspicious": "A black-road day"
        default: "A mixed day"
        }
    }

    private func standingColour(_ standing: String) -> Color {
        switch standing {
        case "auspicious": Palette.gold
        case "inauspicious": Palette.rose
        default: Palette.ink
        }
    }

    private func standingLine(_ day: AlmanacDay) -> String {
        "\(day.spirit.name) governs the day on the \(day.spirit.road), and the officer is \(day.dayOfficer). "
        + "It clashes with the \(day.clash), and its harm stands to the \(day.harmDirection)."
    }

    private func verdictWord(_ verdict: String) -> String {
        switch verdict {
        case "suitable": "Yes — the day suits it"
        case "avoid": "No — the day is against it"
        default: "The almanac is silent"
        }
    }

    private func verdictColour(_ verdict: String) -> Color {
        switch verdict {
        case "suitable": Palette.gold
        case "avoid": Palette.rose
        default: Palette.inkSoft
        }
    }
}

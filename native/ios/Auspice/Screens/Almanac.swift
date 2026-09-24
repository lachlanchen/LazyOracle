import SwiftUI

// MARK: - What the rules hand back

struct AlmanacDay: Codable {
    struct Lunar: Codable {
        let text: String
        let yearGanZhi: String
        let monthGanZhi: String
        let dayGanZhi: String
        let zodiac: String
    }

    struct SolarTermRef: Codable {
        let name: String
        let date: String
    }

    struct Mansion: Codable {
        let name: String
        let animal: String
        let direction: String
        let beast: String
    }

    struct Spirit: Codable {
        let name: String
        let road: String
        let luck: String
    }

    struct Hour: Codable, Identifiable {
        let ganzhi: String
        let range: String
        let spirit: String
        let lucky: Bool
        var id: String { ganzhi + range }
    }

    struct Judgement: Codable {
        struct Basis: Codable {
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

struct AlmanacActivity: Codable, Identifiable {
    struct Name: Codable {
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
    static let shared = AlmanacStore()
    var day: AlmanacDay?
    var activities: [AlmanacActivity] = []
    var activity: String? = PracticeStorage.read("almanac.activity", default: Optional<String>.none) { didSet { PracticeStorage.write(activity, key: "almanac.activity") } }
    var date: Date = PracticeStorage.read("almanac.date", default: Date()) { didSet { PracticeStorage.write(date, key: "almanac.date") } }
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
            self.error = l("This reading could not be computed. Please try again.")
        }
    }

    func shift(_ days: Int) {
        date = Calendar.current.date(byAdding: .day, value: days, to: date) ?? date
        load()
    }
}

// MARK: - The screen

struct AlmanacScreen: View {
    @State private var store = AlmanacStore.shared

    var body: some View {
        ScreenScaffold(
            eyebrow: t("practice.almanac"),
            title: t("almanac.title"),
            tagline: t("almanac.tagline")
        ) {
            dayPicker
            if let error = store.error {
                Panel(title: t("common.notComputed")) {
                    Text(error).font(Typeface.serif(16)).foregroundStyle(Palette.inkSoft)
                }
            }
            if let day = store.day {
                standingPanel(day)
                activityPanel(day)
                listsPanel(day)
                hoursPanel(day)
                tablesPanel(day)
                ExplainReading(result: day).id(day.date)
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
                    Text(lunarDateText(lunar)).font(Typeface.serif(15)).foregroundStyle(Palette.inkMute)
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
                Text(l(day.lunar.dayGanZhi))
                    .font(Typeface.serif(18))
                    .foregroundStyle(Palette.inkSoft)
                Spacer()
                Text(l(day.dayOfficer))
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
        Panel(title: t("almanac.canIDoIt")) {
            FlowRow(spacing: 8) {
                ForEach(store.activities) { item in
                    Button {
                        store.activity = store.activity == item.id ? nil : item.id
                        store.load()
                    } label: {
                        HStack(spacing: 6) {
                            Text(l(item.name.en))
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
                    Text(judgementLine(judgement, day))
                        .font(Typeface.serif(17))
                        .foregroundStyle(Palette.inkSoft)
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
                termColumn("", t("common.suits"), day.yi, Palette.gold)
                Divider().overlay(Palette.line)
                termColumn("", t("common.avoid"), day.ji, Palette.rose)
            }
        }
    }

    private func termColumn(_ mark: String, _ label: String, _ terms: [String], _ colour: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text(l(mark))
                    .font(Typeface.display(20))
                    .foregroundStyle(colour)
                Text(label.uppercased())
                    .font(Typeface.sans(11, weight: .bold))
                    .tracking(1.8)
                    .foregroundStyle(Palette.inkMute)
            }
            ForEach(terms.isEmpty ? ["—"] : terms, id: \.self) { term in
                Text(glossed(term))
                    .font(Typeface.serif(17))
                    .foregroundStyle(Palette.inkSoft)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func hoursPanel(_ day: AlmanacDay) -> some View {
        Panel(title: t("almanac.hours")) {
            VStack(spacing: 0) {
                ForEach(day.hours) { hour in
                    HStack(spacing: 10) {
                        Text(l(hour.ganzhi))
                            .font(Typeface.display(16))
                            .foregroundStyle(hour.lucky ? Palette.gold : Palette.inkMute)
                            .frame(width: 44, alignment: .leading)
                        Text(hour.range)
                            .font(Typeface.sans(14))
                            .foregroundStyle(Palette.inkSoft)
                            .frame(width: 104, alignment: .leading)
                        Text(l(hour.spirit))
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
        Panel(title: t("almanac.tables")) {
            row(l("Stems and branches"), lf("Year {0} · Month {1} · Day {2} · Zodiac {3}", day.lunar.yearGanZhi, day.lunar.monthGanZhi, day.lunar.dayGanZhi, day.lunar.zodiac))
            row(l("Day officer"), l(day.dayOfficer))
            row(l("Lunar mansion"), [day.mansion.name, day.mansion.animal, day.mansion.direction, day.mansion.beast].map(l).joined(separator: " · "))
            row(l("Day spirit"), [day.spirit.name, day.spirit.road, day.spirit.luck].map(l).joined(separator: " · "))
            row(l("Clash and direction"), lf("Clash: {0} · Direction: {1}", day.clash, day.harmDirection))
            if let term = day.solarTerm { row(l("Solar term"), l(term)) }
            else { row(l("Next solar term"), "\(l(day.nextSolarTerm.name)) · \(day.nextSolarTerm.date)") }
            if !day.auspicious.isEmpty { row(l("Favourable spirits"), day.auspicious.map(l).joined(separator: " · ")) }
            if !day.inauspicious.isEmpty { row(l("Unfavourable spirits"), day.inauspicious.map(l).joined(separator: " · ")) }
            if !day.pengzu.isEmpty { row(l("Peng Zu taboos"), day.pengzu.map(l).joined(separator: " · ")) }
        }
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(l(label))
                .font(Typeface.sans(12, weight: .bold))
                .tracking(1.4)
                .foregroundStyle(Palette.inkMute)
                .frame(width: 76, alignment: .leading)
            Text(l(value))
                .font(Typeface.serif(16))
                .foregroundStyle(Palette.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .padding(.vertical, 4)
    }

    private func standingWord(_ standing: String) -> String {
        switch standing {
        case "auspicious": t("almanac.yellowDay")
        case "inauspicious": t("almanac.blackDay")
        default: t("almanac.mixedDay")
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
        lf("{0} governs the day on the {1}. The day officer is {2}. Clash: {3}; direction: {4}.", day.spirit.name, day.spirit.road, day.dayOfficer, day.clash, day.harmDirection)
    }

    private func judgementLine(_ judgement: AlmanacDay.Judgement, _ day: AlmanacDay) -> String {
        if let matched = judgement.matched {
            return lf(judgement.verdict == "avoid" ? "The almanac lists {0} among activities to avoid." : "The almanac lists {0} among suitable activities.", matched)
        }
        return lf("This activity is not explicitly listed. The day officer is {0}; the day spirit is {1}.", day.dayOfficer, day.spirit.name)
    }

    private func verdictWord(_ verdict: String) -> String {
        switch verdict {
        case "suitable": t("almanac.yes")
        case "avoid": t("almanac.no")
        default: t("almanac.silent")
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

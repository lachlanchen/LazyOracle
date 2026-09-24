import SwiftUI

struct BaziScreen: View {
    @State private var store = ProfileStore.shared
    @SavedPractice("bazi.chart") private var chart: BaziChart? = nil
    @State private var error: String?
    @SavedPractice("bazi.profile") private var computedProfile: BirthProfile? = nil
    @State private var editing = false
    @State private var elementsShown = false

    private let elementOrder = ["木", "火", "土", "金", "水"]
    private let elementNames = ["木": "Wood", "火": "Fire", "土": "Earth", "金": "Metal", "水": "Water"]

    var body: some View {
        ScreenScaffold(
            eyebrow: t("practice.bazi"),
            title: t("bazi.title"),
            tagline: t("bazi.tagline")
        ) {
            BirthSummary(profile: store.profile) { editing = true }

            if let error {
                Panel(title: t("common.notComputed")) {
                    Text(error).font(Typeface.serif(16)).foregroundStyle(Palette.inkSoft)
                }
            }

            if let chart {
                pillarsPanel(chart)
                dayMasterPanel(chart)
                elementsPanel(chart)
                luckPanel(chart)
                methodPanel(chart)
                ExplainReading(result: chart)
            }
        }
        .sheet(isPresented: $editing) {
            BirthForm(profile: $store.profile) { compute() }
        }
        .onAppear { if chart == nil || computedProfile != store.profile { compute() } }
    }

    private func pillarsPanel(_ chart: BaziChart) -> some View {
        Panel {
            HStack(spacing: 8) {
                pillarColumn(t("bazi.hour"), chart.pillars.hour, isDay: false)
                pillarColumn(t("bazi.day"), chart.pillars.day, isDay: true)
                pillarColumn(t("bazi.month"), chart.pillars.month, isDay: false)
                pillarColumn(t("bazi.year"), chart.pillars.year, isDay: false)
            }
        }
    }

    private func pillarColumn(_ label: String, _ pillar: Pillar, isDay: Bool) -> some View {
        VStack(spacing: 6) {
            Text(label.uppercased())
                .font(Typeface.sans(10, weight: .bold))
                .tracking(1.4)
                .foregroundStyle(Palette.inkMute)
            Text(l(pillar.stemGod))
                .font(Typeface.sans(12, weight: .semibold))
                .foregroundStyle(isDay ? Palette.gold : Palette.inkSoft)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            VStack(spacing: 2) {
                Text(l(pillar.stem))
                    .font(Typeface.display(30))
                    .foregroundStyle(elementColour(pillar.element))
                Text(l(pillar.branch))
                    .font(Typeface.display(30))
                    .foregroundStyle(Palette.ink)
            }
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(isDay ? Palette.goldSoft : Color.white.opacity(0.04))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(isDay ? Palette.goldLine : Palette.line, lineWidth: 1)
            )
            VStack(spacing: 1) {
                ForEach(pillar.hiddenStems) { hidden in
                    Text("\(l(hidden.stem)) · \(l(hidden.god))")
                        .font(Typeface.sans(10))
                        .foregroundStyle(Palette.inkMute)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
            }
            Text(l(pillar.naYin))
                .font(Typeface.serif(12))
                .foregroundStyle(Palette.inkMute)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .frame(maxWidth: .infinity)
    }

    private func dayMasterPanel(_ chart: BaziChart) -> some View {
        Panel(title: t("bazi.dayMaster")) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(l(chart.dayMaster.stem))
                    .font(Typeface.display(40))
                    .foregroundStyle(elementColour(chart.dayMaster.element))
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(l(chart.dayMaster.yinYang)) · \(l(chart.dayMaster.element))")
                        .font(Typeface.display(19))
                        .foregroundStyle(Palette.ink)
                    Text(strengthLine(chart))
                        .font(Typeface.serif(16))
                        .foregroundStyle(Palette.inkSoft)
                }
                Spacer(minLength: 0)
            }
            if !chart.favourable.isEmpty {
                Text(t("bazi.favourable") + ": " + chart.favourable.map(l).joined(separator: " · "))
                    .font(Typeface.serif(16))
                    .foregroundStyle(Palette.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Text(lf("Year {0}: {1}. Relationship to the day master: {2}.", String(chart.currentYear.year), chart.currentYear.ganzhi, chart.currentYear.god))
                .font(Typeface.serif(16))
                .foregroundStyle(Palette.inkMute)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func elementsPanel(_ chart: BaziChart) -> some View {
        Panel(title: t("bazi.elements")) {
            VStack(spacing: 10) {
                ForEach(elementOrder, id: \.self) { element in
                    HStack(spacing: 10) {
                        Text(l(element))
                            .font(Typeface.display(18))
                            .foregroundStyle(elementColour(element))
                            .frame(minWidth: 48, alignment: .leading)
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                Capsule().fill(Color.white.opacity(0.06))
                                Capsule()
                                    .fill(elementColour(element))
                                    .frame(width: elementsShown ? geometry.size.width * fraction(chart, element) : 0)
                            }
                        }
                        .frame(height: 8)
                        Text(String(format: "%.1f", chart.elements[element] ?? 0))
                            .font(Typeface.sans(13, weight: .semibold))
                            .foregroundStyle(Palette.inkSoft)
                            .frame(width: 32, alignment: .trailing)
                    }
                }
            }
            .onAppear {
                withAnimation(.easeOut(duration: 0.8).delay(0.15)) { elementsShown = true }
            }
        }
    }

    private func luckPanel(_ chart: BaziChart) -> some View {
        Panel(title: t("bazi.luck")) {
            Text(lf("The first cycle begins {0} years and {1} months after birth, counted to the governing solar term.", String(chart.luckStart.years), String(chart.luckStart.months)))
                .font(Typeface.serif(16))
                .foregroundStyle(Palette.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(chart.luckCycles) { cycle in
                        VStack(spacing: 4) {
                            Text(l(cycle.ganzhi))
                                .font(Typeface.display(21))
                                .foregroundStyle(current(cycle) ? Palette.gold : Palette.ink)
                            Text("\(cycle.startAge)–\(cycle.startAge + 9)")
                                .font(Typeface.sans(12))
                                .foregroundStyle(Palette.inkMute)
                            Text("\(cycle.startYear)")
                                .font(Typeface.sans(11))
                                .foregroundStyle(Palette.inkMute)
                        }
                        .padding(.vertical, 10)
                        .padding(.horizontal, 14)
                        .background(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(current(cycle) ? Palette.goldSoft : Color.white.opacity(0.04))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .strokeBorder(current(cycle) ? Palette.goldLine : Palette.line, lineWidth: 1)
                        )
                    }
                }
                .padding(.vertical, 2)
            }
        }
    }

    private func methodPanel(_ chart: BaziChart) -> some View {
        Panel(title: t("common.method")) {
            Text(lf("The Ziping method uses solar terms and true solar time. Your birth time was corrected by {0} minutes for longitude and the equation of time.", String(Int(chart.solarCorrectionMinutes.rounded()))))
                .font(Typeface.serif(16))
                .foregroundStyle(Palette.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
            Text(lf("Between {0} and {1}", chart.lunar.jieQiBefore, chart.lunar.jieQiAfter))
                .font(Typeface.serif(15))
                .foregroundStyle(Palette.inkMute)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func current(_ cycle: LuckCycle) -> Bool {
        let year = Calendar.current.component(.year, from: Date())
        return year >= cycle.startYear && year <= cycle.endYear
    }

    private func fraction(_ chart: BaziChart, _ element: String) -> Double {
        min(1, (chart.elements[element] ?? 0) / 8)
    }

    private func strengthLine(_ chart: BaziChart) -> String {
        switch chart.strength {
        case "strong": t("bazi.strong")
        case "weak": t("bazi.weak")
        default: t("bazi.balanced")
        }
    }

    private func elementColour(_ element: String) -> Color {
        switch element {
        case "木": Color(hex: 0x7BC47F)
        case "火": Palette.rose
        case "土": Color(hex: 0xCBA96B)
        case "金": Color(hex: 0xE3E3EA)
        case "水": Color(hex: 0x7FAEE0)
        default: Palette.ink
        }
    }

    private func compute() {
        guard store.profile.isComplete else { error = nil
            computedProfile = store.profile; chart = nil; return }
        do {
            chart = try Engines.shared.evaluate("bazi.chart", store.profile.engineInput, as: BaziChart.self)
            error = nil
        } catch {
            self.error = l("This reading could not be computed. Please try again.")
        }
    }
}

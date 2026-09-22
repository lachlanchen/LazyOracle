import SwiftUI

struct BaziScreen: View {
    @State private var store = ProfileStore.shared
    @State private var chart: BaziChart?
    @State private var error: String?
    @State private var editing = false
    @State private var elementsShown = false

    private let elementOrder = ["木", "火", "土", "金", "水"]
    private let elementNames = ["木": "Wood", "火": "Fire", "土": "Earth", "金": "Metal", "水": "Water"]

    var body: some View {
        ScreenScaffold(
            eyebrow: "八字 · Four Pillars",
            title: "Your four pillars",
            tagline: "Stem and branch for the year, month, day and hour of your birth."
        ) {
            BirthSummary(profile: store.profile) { editing = true }

            if let error {
                Panel(title: "Not computed") {
                    Text(error).font(Typeface.serif(16)).foregroundStyle(Palette.inkSoft)
                }
            }

            if let chart {
                pillarsPanel(chart)
                dayMasterPanel(chart)
                elementsPanel(chart)
                luckPanel(chart)
                methodPanel(chart)
            }
        }
        .sheet(isPresented: $editing) {
            BirthForm(profile: $store.profile) { compute() }
        }
        .onAppear(perform: compute)
    }

    private func pillarsPanel(_ chart: BaziChart) -> some View {
        Panel {
            HStack(spacing: 8) {
                pillarColumn("Hour", "时", chart.pillars.hour, isDay: false)
                pillarColumn("Day", "日", chart.pillars.day, isDay: true)
                pillarColumn("Month", "月", chart.pillars.month, isDay: false)
                pillarColumn("Year", "年", chart.pillars.year, isDay: false)
            }
        }
    }

    private func pillarColumn(_ label: String, _ mark: String, _ pillar: Pillar, isDay: Bool) -> some View {
        VStack(spacing: 6) {
            Text(label.uppercased())
                .font(Typeface.sans(10, weight: .bold))
                .tracking(1.4)
                .foregroundStyle(Palette.inkMute)
            Text(pillar.stemGod)
                .font(Typeface.sans(12, weight: .semibold))
                .foregroundStyle(isDay ? Palette.gold : Palette.inkSoft)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            VStack(spacing: 2) {
                Text(pillar.stem)
                    .font(Typeface.display(30))
                    .foregroundStyle(elementColour(pillar.element))
                Text(pillar.branch)
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
                    Text("\(hidden.stem)\(hidden.god)")
                        .font(Typeface.sans(10))
                        .foregroundStyle(Palette.inkMute)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
            }
            Text(pillar.naYin)
                .font(Typeface.serif(12))
                .foregroundStyle(Palette.inkMute)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .frame(maxWidth: .infinity)
    }

    private func dayMasterPanel(_ chart: BaziChart) -> some View {
        Panel(title: "Day master") {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(chart.dayMaster.stem)
                    .font(Typeface.display(40))
                    .foregroundStyle(elementColour(chart.dayMaster.element))
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(chart.dayMaster.yinYang)\(chart.dayMaster.element) · \(elementNames[chart.dayMaster.element] ?? "")")
                        .font(Typeface.display(19))
                        .foregroundStyle(Palette.ink)
                    Text(strengthLine(chart))
                        .font(Typeface.serif(16))
                        .foregroundStyle(Palette.inkSoft)
                }
                Spacer(minLength: 0)
            }
            if !chart.favourable.isEmpty {
                Text("Favourable: " + chart.favourable.map { "\($0) \(elementNames[$0] ?? "")" }.joined(separator: " · "))
                    .font(Typeface.serif(16))
                    .foregroundStyle(Palette.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Text("This year \(chart.currentYear.year) is \(chart.currentYear.ganzhi), which stands to the day master as \(chart.currentYear.god).")
                .font(Typeface.serif(16))
                .foregroundStyle(Palette.inkMute)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func elementsPanel(_ chart: BaziChart) -> some View {
        Panel(title: "The five elements") {
            VStack(spacing: 10) {
                ForEach(elementOrder, id: \.self) { element in
                    HStack(spacing: 10) {
                        Text(element)
                            .font(Typeface.display(18))
                            .foregroundStyle(elementColour(element))
                            .frame(width: 24)
                        Text(elementNames[element] ?? "")
                            .font(Typeface.sans(13))
                            .foregroundStyle(Palette.inkMute)
                            .frame(width: 52, alignment: .leading)
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
        Panel(title: "Luck cycles") {
            Text("The first cycle begins at \(chart.luckStart.years) years and \(chart.luckStart.months) months, counted from birth to the governing solar term.")
                .font(Typeface.serif(16))
                .foregroundStyle(Palette.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(chart.luckCycles) { cycle in
                        VStack(spacing: 4) {
                            Text(cycle.ganzhi)
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
        Panel(title: "Method") {
            Text("子平法: the pillars are taken from the solar terms, not the lunar month, and the hour pillar from true solar time. Your birth time was corrected by \(Int(chart.solarCorrectionMinutes.rounded())) minutes for longitude and the equation of time.")
                .font(Typeface.serif(16))
                .foregroundStyle(Palette.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
            Text("\(chart.lunar.text) · between \(chart.lunar.jieQiBefore) and \(chart.lunar.jieQiAfter)")
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
        case "strong": "Strong at the root, and well supported."
        case "weak": "Weak at the root, and in need of support."
        default: "Balanced between support and drain."
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
        guard store.profile.isComplete else { error = nil; chart = nil; return }
        do {
            chart = try Engines.shared.evaluate("bazi.chart", store.profile.engineInput, as: BaziChart.self)
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}

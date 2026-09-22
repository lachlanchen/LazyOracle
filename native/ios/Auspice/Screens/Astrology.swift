import SwiftUI

struct AstrologyScreen: View {
    @State private var store = ProfileStore.shared
    @State private var chart: NatalChart?
    @State private var report: TransitReport?
    @State private var error: String?
    @State private var editing = false
    @State private var wheelIn = false

    var body: some View {
        ScreenScaffold(
            eyebrow: "星盘 · Astrology",
            title: "The sky at your birth",
            tagline: "Computed from the ephemeris, not from a lookup table."
        ) {
            BirthSummary(profile: store.profile) { editing = true }

            if let error {
                Panel(title: "Not computed") {
                    Text(error).font(Typeface.serif(16)).foregroundStyle(Palette.inkSoft)
                }
            }

            if let chart {
                Panel {
                    ChartWheel(chart: chart, appeared: wheelIn)
                        .aspectRatio(1, contentMode: .fit)
                        .frame(maxWidth: .infinity)
                        .onAppear {
                            withAnimation(.easeOut(duration: 1.1)) { wheelIn = true }
                        }
                    HStack(spacing: 16) {
                        angle("Ascendant", chart.ascendant)
                        angle("Midheaven", chart.midheaven)
                    }
                    .frame(maxWidth: .infinity)
                }

                Panel(title: "Placements") {
                    ForEach(chart.placements) { placement in
                        placementRow(placement)
                        if placement.id != chart.placements.last?.id {
                            Divider().overlay(Palette.line)
                        }
                    }
                }

                if !chart.aspects.isEmpty {
                    Panel(title: "Aspects") {
                        ForEach(chart.aspects) { aspect in
                            HStack(spacing: 10) {
                                Text(Zodiac.bodySymbols[aspect.a] ?? aspect.a)
                                    .font(Typeface.display(19))
                                    .foregroundStyle(Palette.ink)
                                Text(aspectGlyph(aspect.type))
                                    .font(Typeface.display(17))
                                    .foregroundStyle(aspectColour(aspect.type))
                                Text(Zodiac.bodySymbols[aspect.b] ?? aspect.b)
                                    .font(Typeface.display(19))
                                    .foregroundStyle(Palette.ink)
                                Text("\(aspect.a) \(aspect.type) \(aspect.b)")
                                    .font(Typeface.serif(15))
                                    .foregroundStyle(Palette.inkSoft)
                                Spacer(minLength: 0)
                                Text(String(format: "%.1f°", aspect.orb))
                                    .font(Typeface.sans(12))
                                    .foregroundStyle(Palette.inkMute)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }

                if let report, !report.transits.isEmpty {
                    Panel(title: "Today against your chart") {
                        ForEach(report.transits.prefix(12)) { transit in
                            HStack(spacing: 10) {
                                Text("\(Zodiac.bodySymbols[transit.transiting] ?? "") \(aspectGlyph(transit.type)) \(Zodiac.bodySymbols[transit.natal] ?? "")")
                                    .font(Typeface.display(18))
                                    .foregroundStyle(aspectColour(transit.type))
                                Text("transiting \(transit.transiting) \(transit.type) natal \(transit.natal)")
                                    .font(Typeface.serif(15))
                                    .foregroundStyle(Palette.inkSoft)
                                Spacer(minLength: 0)
                                Text(String(format: "%.1f°", transit.orb))
                                    .font(Typeface.sans(12))
                                    .foregroundStyle(Palette.inkMute)
                            }
                            .padding(.vertical, 3)
                        }
                    }
                }

                Panel(title: "Method") {
                    Text("Positions come from the astronomy engine for the exact instant of birth in UTC, with whole-sign houses counted from the ascendant. The moon stands at \(Int((chart.moonPhase * 100).rounded()))% of its cycle.")
                        .font(Typeface.serif(16))
                        .foregroundStyle(Palette.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .sheet(isPresented: $editing) {
            BirthForm(profile: $store.profile) { compute() }
        }
        .onAppear(perform: compute)
    }

    private func angle(_ label: String, _ degrees: Double) -> some View {
        VStack(spacing: 2) {
            Text(label.uppercased())
                .font(Typeface.sans(10, weight: .bold))
                .tracking(1.6)
                .foregroundStyle(Palette.inkMute)
            Text(degreeText(degrees))
                .font(Typeface.display(17))
                .foregroundStyle(Palette.gold)
        }
    }

    private func placementRow(_ placement: Placement) -> some View {
        HStack(spacing: 12) {
            Text(Zodiac.bodySymbols[placement.body] ?? "")
                .font(Typeface.display(21))
                .foregroundStyle(Palette.gold)
                .frame(width: 26)
            Text(placement.body)
                .font(Typeface.sans(15, weight: .semibold))
                .foregroundStyle(Palette.ink)
                .frame(width: 78, alignment: .leading)
            Text(degreeText(placement.longitude))
                .font(Typeface.serif(16))
                .foregroundStyle(Palette.inkSoft)
            if placement.retrograde {
                Text("℞").font(Typeface.display(15)).foregroundStyle(Palette.rose)
            }
            Spacer(minLength: 0)
            Text("House \(placement.house)")
                .font(Typeface.sans(12))
                .foregroundStyle(Palette.inkMute)
        }
        .padding(.vertical, 5)
    }

    private func degreeText(_ longitude: Double) -> String {
        let sign = Int(longitude / 30) % 12
        let within = longitude - Double(sign) * 30
        let degrees = Int(within)
        let minutes = Int((within - Double(degrees)) * 60)
        return String(format: "%d°%02d′ %@ %@", degrees, minutes, Zodiac.signs[sign].symbol, Zodiac.signs[sign].zh)
    }

    private func aspectGlyph(_ type: String) -> String {
        switch type {
        case "conjunction": "☌"
        case "sextile": "⚹"
        case "square": "□"
        case "trine": "△"
        default: "☍"
        }
    }

    private func aspectColour(_ type: String) -> Color {
        switch type {
        case "trine", "sextile": Color(hex: 0x7BC47F)
        case "square", "opposition": Palette.rose
        default: Palette.gold
        }
    }

    private func compute() {
        guard store.profile.isComplete else { chart = nil; return }
        do {
            let input = store.profile.engineInput
            chart = try Engines.shared.evaluate("astrology.chart", input, as: NatalChart.self)
            report = try? Engines.shared.evaluate("astrology.transits", ["birth": input], as: TransitReport.self)
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}

/// The chart wheel: twelve signs, the houses from the ascendant, the aspect
/// lines across the middle, and the bodies on the rim.
struct ChartWheel: View {
    let chart: NatalChart
    let appeared: Bool

    var body: some View {
        GeometryReader { geometry in
            let size = min(geometry.size.width, geometry.size.height)
            let centre = CGPoint(x: geometry.size.width / 2, y: geometry.size.height / 2)
            let outer = size * 0.47
            let inner = size * 0.33
            let aspectRadius = size * 0.30

            ZStack {
                Canvas { context, _ in
                    // The rim, and the twelve sign divisions.
                    context.stroke(
                        Path(ellipseIn: CGRect(x: centre.x - outer, y: centre.y - outer, width: outer * 2, height: outer * 2)),
                        with: .color(Palette.goldLine),
                        lineWidth: 1
                    )
                    context.stroke(
                        Path(ellipseIn: CGRect(x: centre.x - inner, y: centre.y - inner, width: inner * 2, height: inner * 2)),
                        with: .color(Palette.line),
                        lineWidth: 1
                    )
                    for index in 0..<12 {
                        let angle = self.angle(for: Double(index) * 30)
                        var path = Path()
                        path.move(to: point(centre, inner, angle))
                        path.addLine(to: point(centre, outer, angle))
                        context.stroke(path, with: .color(Palette.line), lineWidth: 1)
                    }
                    // The houses, counted whole-sign from the ascendant.
                    for index in 0..<12 {
                        let angle = self.angle(for: Double(chart.ascendantSign) * 30 + Double(index) * 30)
                        var path = Path()
                        path.move(to: point(centre, aspectRadius, angle))
                        path.addLine(to: point(centre, inner, angle))
                        context.stroke(path, with: .color(Palette.gold.opacity(0.25)), lineWidth: 1)
                    }
                    // Aspect lines, drawn inside.
                    for aspect in chart.aspects {
                        guard let a = chart.placements.first(where: { $0.body == aspect.a }),
                              let b = chart.placements.first(where: { $0.body == aspect.b }) else { continue }
                        var path = Path()
                        path.move(to: point(centre, aspectRadius, self.angle(for: a.longitude)))
                        path.addLine(to: point(centre, aspectRadius, self.angle(for: b.longitude)))
                        context.stroke(path, with: .color(colour(aspect.type)), lineWidth: 1)
                    }
                    // The ascendant, marked in gold across the left.
                    var ascendant = Path()
                    ascendant.move(to: point(centre, aspectRadius, self.angle(for: chart.ascendant)))
                    ascendant.addLine(to: point(centre, outer, self.angle(for: chart.ascendant)))
                    context.stroke(ascendant, with: .color(Palette.gold), lineWidth: 2)
                }

                // Sign glyphs on the rim.
                ForEach(0..<12, id: \.self) { index in
                    Text(Zodiac.signs[index].symbol)
                        .font(.system(size: size * 0.05))
                        .foregroundStyle(Palette.inkMute)
                        .position(point(centre, (outer + inner) / 2, angle(for: Double(index) * 30 + 15)))
                }

                // The bodies, just inside the rim.
                ForEach(chart.placements) { placement in
                    Text(Zodiac.bodySymbols[placement.body] ?? "")
                        .font(.system(size: size * 0.062))
                        .foregroundStyle(Palette.gold)
                        .position(point(centre, inner * 0.86, angle(for: placement.longitude)))
                }
            }
            .rotationEffect(.degrees(appeared ? 0 : -18))
            .opacity(appeared ? 1 : 0)
            .scaleEffect(appeared ? 1 : 0.92)
        }
    }

    /// Zero degrees Aries to the left, counting anticlockwise, as charts are drawn.
    private func angle(for longitude: Double) -> Double {
        (180 - longitude) * .pi / 180
    }

    private func point(_ centre: CGPoint, _ radius: CGFloat, _ angle: Double) -> CGPoint {
        CGPoint(
            x: centre.x + CGFloat(Foundation.cos(angle)) * radius,
            y: centre.y - CGFloat(Foundation.sin(angle)) * radius
        )
    }

    private func colour(_ type: String) -> Color {
        switch type {
        case "trine", "sextile": Color(hex: 0x7BC47F).opacity(0.55)
        case "square", "opposition": Palette.rose.opacity(0.5)
        default: Palette.gold.opacity(0.5)
        }
    }
}

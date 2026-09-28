import SwiftUI

struct HexagramStudy: Codable {
    let kind: String
    let version: Int
    let primary: Hexagram
    let resulting: Hexagram
    let changingPositions: [Int]
    let nuclear: Hexagram
    let opposite: Hexagram
    let inverse: Hexagram
}

struct ChangeAtlasScreen: View {
    @SavedPractice("atlas.number") private var number = 11
    @SavedPractice("atlas.changing") private var changing: [Int] = []
    @State private var study: HexagramStudy?
    @State private var catalogue: [Hexagram] = []
    @State private var error: String?
    var body: some View {
        ScreenScaffold(eyebrow: t("app.name"), title: t("study.title"), tagline: t("study.tagline"), bottomPadding: 28) {
            Panel {
                Picker(t("study.choose"), selection: $number) {
                    ForEach(catalogue, id: \.number) { hex in Text("\(hex.number) · \(l(hex.name.en))").tag(hex.number) }
                }.tint(Palette.gold).accessibilityIdentifier("atlas.choose")
                Text(t("study.hint")).font(Typeface.serif(17)).foregroundStyle(Palette.inkSoft)
            }
            if let study {
                Panel(title: t("study.lines")) {
                    HStack { Text(t("study.before")); Spacer(); Text(t("study.after")) }.foregroundStyle(Palette.inkMute)
                    ForEach((1...6).reversed(), id: \.self) { position in
                        Button {
                            if changing.contains(position) { changing.removeAll { $0 == position } } else { changing.append(position) }
                        } label: {
                            HStack(spacing: 16) {
                                Text("\(position)").frame(width: 22)
                                AtlasLine(yang: study.primary.lines[position - 1] == 1)
                                Image(systemName: "arrow.right").font(.system(size: 12))
                                AtlasLine(yang: study.resulting.lines[position - 1] == 1)
                                Image(systemName: changing.contains(position) ? "checkmark.circle.fill" : "circle").frame(width: 24)
                            }.foregroundStyle(Palette.gold).frame(minHeight: 44).contentShape(Rectangle())
                        }.buttonStyle(.plain).accessibilityLabel("\(t("study.lines")) \(position)")
                            .accessibilityValue("\(l(study.primary.lines[position - 1] == 1 ? "阳" : "阴")) → \(l(study.resulting.lines[position - 1] == 1 ? "阳" : "阴"))").accessibilityIdentifier("atlas.line.\(position)")
                    }
                    Button(t("study.reset")) { changing = [] }.frame(minHeight: 44).accessibilityIdentifier("atlas.reset")
                }
                Panel(title: t("study.before")) { figure(study.primary) }
                Panel(title: t("study.after")) { figure(study.resulting) }
                    .accessibilityIdentifier("atlas.result")
                Panel(title: "\(t("study.before")) · \(study.primary.number)") {
                    transform("study.nuclear", study.nuclear)
                    transform("study.opposite", study.opposite)
                    transform("study.inverse", study.inverse)
                }
                let encoder = JSONEncoder()
                let facts = (try? encoder.encode(study)).flatMap { String(data: $0, encoding: .utf8) } ?? ""
                SaveReadingButton(practice: "atlas", facts: facts)
                Text(t("study.source")).font(Typeface.sans(13)).foregroundStyle(Palette.inkMute)
            }
            if let error { Text(error).foregroundStyle(Palette.rose) }
        }
        .onAppear {
            do { catalogue = try (1...64).map { try Engines.shared.evaluate("iching.hexagram", ["number": $0], as: Hexagram.self) }; calculate() }
            catch { self.error = l("This reading could not be computed. Please try again.") }
        }
        .onChange(of: number) { _, _ in changing = []; calculate() }
        .onChange(of: changing) { _, _ in calculate() }
    }
    private func calculate() {
        do { study = try Engines.shared.evaluate("iching.explore", ["number": number, "changing": changing], as: HexagramStudy.self); error = nil }
        catch { study = nil; self.error = l("This reading could not be computed. Please try again.") }
    }
    private func figure(_ hex: Hexagram) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("\(hex.number) · \(l(hex.name.en))").font(Typeface.display(24)).foregroundStyle(Palette.gold)
            Text("\(t("study.upper")): \(l(hex.upperTrigram.name.en))\n\(t("study.lower")): \(l(hex.lowerTrigram.name.en))")
                .font(Typeface.sans(14)).foregroundStyle(Palette.inkMute)
            Text(l(hex.sense.en)).font(Typeface.serif(18)).foregroundStyle(Palette.ink)
            DisclosureGroup(hex.name.zh) { Text(hex.judgement).font(Typeface.serif(18)).textSelection(.enabled) }.foregroundStyle(Palette.inkSoft)
        }
    }
    private func transform(_ key: String, _ hex: Hexagram) -> some View {
        Button { number = hex.number; changing = [] } label: {
            VStack(alignment: .leading, spacing: 5) {
                Text(t(key)).font(Typeface.sans(13)).foregroundStyle(Palette.inkMute)
                Text("\(hex.number) · \(l(hex.name.en)) →").font(Typeface.serif(18)).foregroundStyle(Palette.gold)
            }.frame(maxWidth: .infinity, minHeight: 54, alignment: .leading)
        }.buttonStyle(.plain).accessibilityIdentifier(key)
    }
}

private struct AtlasLine: View {
    let yang: Bool
    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 2).frame(height: 7)
            if !yang { RoundedRectangle(cornerRadius: 2).frame(height: 7) }
        }.frame(maxWidth: .infinity).accessibilityHidden(true)
    }
}

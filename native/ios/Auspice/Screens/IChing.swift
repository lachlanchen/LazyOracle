import SwiftUI

struct IChingScreen: View {
    @State private var method = "coins"
    @State private var question = ""
    @State private var cast: IChingCast?
    @State private var shown = 0
    @State private var error: String?

    var body: some View {
        ScreenScaffold(
            eyebrow: t("practice.iching"),
            title: t("iching.title"),
            tagline: t("iching.tagline")
        ) {
            Panel {
                FlowRow(spacing: 8) {
                    Chip(label: t("iching.coins"), active: method == "coins") { method = "coins" }
                    Chip(label: t("iching.yarrow"), active: method == "yarrow") { method = "yarrow" }
                }
                FieldLabel(t("tarot.question"))
                TextField("", text: $question, axis: .vertical)
                    .textFieldStyle(AuspiceFieldStyle())
                    .lineLimit(1...3)
                Button(action: throwLines) {
                    Label(t("iching.title"), systemImage: "circle.hexagongrid")
                }
                .buttonStyle(PrimaryButtonStyle())
            }

            if let error {
                Panel(title: t("common.notComputed")) {
                    Text(error).font(Typeface.serif(16)).foregroundStyle(Palette.inkSoft)
                }
            }

            if let cast {
                Panel {
                    HStack(alignment: .center, spacing: 22) {
                        HexagramView(lines: cast.lines, shown: shown)
                        VStack(alignment: .leading, spacing: 5) {
                            Text("\(cast.primary.number)")
                                .font(Typeface.sans(12, weight: .bold))
                                .tracking(2)
                                .foregroundStyle(Palette.gold)
                            Text(cast.primary.name.zh)
                                .font(Typeface.display(30))
                                .foregroundStyle(Palette.ink)
                            Text(cast.primary.name.en)
                                .font(Typeface.display(17))
                                .foregroundStyle(Palette.inkSoft)
                            Text(cast.primary.name.pinyin)
                                .font(Typeface.sans(13))
                                .foregroundStyle(Palette.inkMute)
                            Text("\(cast.primary.upperTrigram.name.zh) over \(cast.primary.lowerTrigram.name.zh)")
                                .font(Typeface.serif(15))
                                .foregroundStyle(Palette.inkMute)
                                .padding(.top, 2)
                        }
                        Spacer(minLength: 0)
                    }
                }

                if shown >= 6 {
                    Panel(title: t("iching.judgement")) {
                        Text(cast.primary.judgement)
                            .font(Typeface.serif(20))
                            .foregroundStyle(Palette.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(cast.primary.sense.en)
                            .font(Typeface.serif(17))
                            .foregroundStyle(Palette.inkSoft)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(cast.primary.sense.zh)
                            .font(Typeface.serif(16))
                            .foregroundStyle(Palette.inkMute)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    Panel(title: t("iching.whereToRead")) {
                        Text(focusLine(cast))
                            .font(Typeface.serif(17))
                            .foregroundStyle(Palette.inkSoft)
                            .fixedSize(horizontal: false, vertical: true)
                        Text("朱熹《易学启蒙》 decides this by the number of moving lines, not by preference.")
                            .font(Typeface.sans(13))
                            .foregroundStyle(Palette.inkMute)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    if let resulting = cast.resulting {
                        Panel(title: t("iching.becomes")) {
                            HStack(spacing: 20) {
                                HexagramView(lines: resulting.lines.map { CastLine(value: $0, yang: $0 == 1, changing: false, coins: nil) }, shown: 6)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("\(resulting.number) · \(resulting.name.zh)")
                                        .font(Typeface.display(22))
                                        .foregroundStyle(Palette.ink)
                                    Text(resulting.name.en)
                                        .font(Typeface.display(16))
                                        .foregroundStyle(Palette.inkSoft)
                                    Text(resulting.sense.en)
                                        .font(Typeface.serif(15))
                                        .foregroundStyle(Palette.inkMute)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                                Spacer(minLength: 0)
                            }
                        }
                    }

                    Panel(title: t("iching.behind")) {
                        relative("互卦 Nuclear", cast.nuclear)
                        relative("错卦 Opposite", cast.opposite)
                        relative("综卦 Inverse", cast.inverse)
                    }
                }
            }
        }
    }

    private func relative(_ label: String, _ hexagram: Hexagram) -> some View {
        HStack(spacing: 12) {
            Text(label)
                .font(Typeface.sans(12, weight: .bold))
                .tracking(1.4)
                .foregroundStyle(Palette.inkMute)
                .frame(width: 132, alignment: .leading)
            Text("\(hexagram.number) \(hexagram.name.zh) · \(hexagram.name.en)")
                .font(Typeface.serif(16))
                .foregroundStyle(Palette.inkSoft)
            Spacer(minLength: 0)
        }
        .padding(.vertical, 3)
    }

    private func focusLine(_ cast: IChingCast) -> String {
        if let explain = cast.focus.explain?.en { return explain }
        switch cast.focus.kind {
        case "judgement": return "Nothing moves, so the judgement of the hexagram answers."
        case "line": return "One line moves; read that line."
        case "two-lines": return "Two lines move; read the upper of them."
        case "both-judgements": return "Three lines move; read both judgements."
        case "resulting-lines": return "Four lines move; read the still lines of the resulting hexagram."
        default: return "Read the judgement of the resulting hexagram."
        }
    }

    private func throwLines() {
        do {
            var input: [String: Any] = ["method": method]
            if !question.trimmingCharacters(in: .whitespaces).isEmpty { input["question"] = question }
            let result = try Engines.shared.evaluate("iching.cast", input, as: IChingCast.self)
            error = nil
            cast = result
            shown = 0
            // The lines arrive one at a time from the bottom, as they are thrown.
            for step in 1...6 {
                DispatchQueue.main.asyncAfter(deadline: .now() + Double(step) * 0.28) {
                    withAnimation(.spring(response: 0.45, dampingFraction: 0.8)) { shown = step }
                }
            }
        } catch {
            self.error = error.localizedDescription
        }
    }
}

/// Six lines, drawn from the bottom up; a moving line carries its mark.
struct HexagramView: View {
    let lines: [CastLine]
    let shown: Int

    var body: some View {
        VStack(spacing: 7) {
            ForEach(Array(lines.enumerated().reversed()), id: \.offset) { index, line in
                LineView(line: line)
                    .opacity(index < shown ? 1 : 0)
                    .offset(y: index < shown ? 0 : 8)
            }
        }
        .frame(width: 92)
    }

    private struct LineView: View {
        let line: CastLine

        var body: some View {
            ZStack {
                if line.yang {
                    Capsule().fill(fill).frame(height: 9)
                } else {
                    HStack(spacing: 10) {
                        Capsule().fill(fill)
                        Capsule().fill(fill)
                    }
                    .frame(height: 9)
                }
                if line.changing {
                    Image(systemName: line.yang ? "circle" : "xmark")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(Palette.night)
                }
            }
            .frame(width: 92)
        }

        private var fill: Color { line.changing ? Palette.rose : Palette.gold }
    }
}

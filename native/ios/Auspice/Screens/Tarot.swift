import SwiftUI

struct TarotScreen: View {
    @State private var spreadId = "three"
    @State private var question = ""
    @FocusState private var questionFocused: Bool
    @State private var draw: TarotDraw?
    @State private var revealed: Set<String> = []
    @State private var dealing = false
    @State private var selected: DrawnCard?
    @State private var error: String?

    private let spreads: [(id: String, label: String, chinese: String, count: Int)] = [
        ("one", "One card", "单张", 1),
        ("three", "Past · Present · Future", "三张", 3),
        ("celtic", "Celtic cross", "凯尔特十字", 10)
    ]

    var body: some View {
        ScreenScaffold(
            eyebrow: t("practice.tarot"),
            title: t("tarot.title"),
            tagline: t("tarot.tagline")
        ) {
            Panel {
                FlowRow(spacing: 8) {
                    ForEach(spreads, id: \.id) { spread in
                        Chip(
                            label: l(spread.label),
                            active: spreadId == spread.id
                        ) {
                            spreadId = spread.id
                            draw = nil
                            revealed = []
                        }
                    }
                }
                FieldLabel(t("tarot.question"))
                TextField("", text: $question, axis: .vertical)
                    .accessibilityIdentifier("tarot.question")
                    .focused($questionFocused)
                    .textFieldStyle(AuspiceFieldStyle())
                    .lineLimit(1...3)
                Button(action: deal) {
                    Label(draw == nil ? t("tarot.draw") : t("tarot.drawAgain"), systemImage: "sparkles")
                }
                .buttonStyle(PrimaryButtonStyle())
                .accessibilityIdentifier("tarot.compute")
                .disabled(dealing)
            }

            if let error {
                Panel(title: t("common.notComputed")) {
                    Text(error).font(Typeface.serif(16)).foregroundStyle(Palette.inkSoft)
                }
            }

            if let draw {
                ExplainReading(result: draw).id(draw.seed)
                Panel {
                    SpreadStage(draw: draw, revealed: revealed, tap: { card in
                        if revealed.contains(card.id) {
                            selected = card
                        } else {
                            _ = withAnimation(.spring(response: 0.55, dampingFraction: 0.75)) {
                                revealed.insert(card.id)
                            }
                        }
                    })
                    .frame(height: stageHeight(draw.spread.id))
                    if revealed.count < draw.cards.count {
                        Text(t("tarot.tapToTurn"))
                            .font(Typeface.sans(13))
                            .foregroundStyle(Palette.inkMute)
                            .frame(maxWidth: .infinity)
                    }
                }

                ForEach(draw.cards.filter { revealed.contains($0.id) }) { card in
                    CardReading(card: card)
                }
            }
        }
        .sheet(item: $selected) { card in
            CardDetail(card: card)
        }
    }

    private func stageHeight(_ spread: String) -> CGFloat {
        switch spread {
        case "one": 230
        case "three": 210
        default: 430
        }
    }

    private func deal() {
        questionFocused = false
        dealing = true
        revealed = []
        do {
            var input: [String: Any] = ["spread": spreadId]
            if !question.trimmingCharacters(in: .whitespaces).isEmpty { input["question"] = question }
            let result = try Engines.shared.evaluate("tarot.draw", input, as: TarotDraw.self)
            error = nil
            withAnimation(.easeOut(duration: 0.3)) { draw = result }
            // Deal them face down, then turn the first after a beat, the way a
            // reader lays the spread out before saying anything.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) {
                if let first = result.cards.first {
                    withAnimation(.spring(response: 0.6, dampingFraction: 0.75)) {
                        _ = revealed.insert(first.id)
                    }
                }
                dealing = false
            }
        } catch {
            self.error = l("This reading could not be computed. Please try again.")
            dealing = false
        }
    }
}

/// The cards, placed by the spread's own 0–1 layout grid.
private struct SpreadStage: View {
    let draw: TarotDraw
    let revealed: Set<String>
    let tap: (DrawnCard) -> Void

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                ForEach(Array(draw.cards.enumerated()), id: \.element.id) { index, card in
                    TarotCardView(
                        card: card,
                        faceUp: revealed.contains(card.id),
                        size: cardSize(geometry.size)
                    )
                    .rotationEffect(.degrees(card.position.layout.rotate == true ? 90 : 0))
                    .position(
                        x: card.position.layout.x * geometry.size.width,
                        y: card.position.layout.y * geometry.size.height
                    )
                    .onTapGesture { tap(card) }
                    .transition(.opacity.combined(with: .scale(scale: 0.8)))
                    .animation(
                        .spring(response: 0.5, dampingFraction: 0.8).delay(Double(index) * 0.07),
                        value: draw.seed
                    )
                }
            }
        }
    }

    private func cardSize(_ available: CGSize) -> CGSize {
        let count = draw.cards.count
        let width: CGFloat = count > 3 ? 58 : min(94, available.width / CGFloat(count) - 14)
        return CGSize(width: width, height: width * 1.62)
    }
}

/// One card, with a real three-dimensional turn rather than a cross-fade.
struct TarotCardView: View {
    let card: DrawnCard
    let faceUp: Bool
    let size: CGSize

    var body: some View {
        ZStack {
            back.opacity(faceUp ? 0 : 1)
            face
                .opacity(faceUp ? 1 : 0)
                .rotation3DEffect(.degrees(180), axis: (x: 0, y: 1, z: 0))
        }
        .frame(width: size.width, height: size.height)
        .rotation3DEffect(.degrees(faceUp ? 180 : 0), axis: (x: 0, y: 1, z: 0), perspective: 0.45)
        .shadow(color: .black.opacity(0.45), radius: 10, y: 6)
    }

    private var back: some View {
        RoundedRectangle(cornerRadius: 9, style: .continuous)
            .fill(
                LinearGradient(
                    colors: [Palette.night3, Palette.night2],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .strokeBorder(Palette.goldLine, lineWidth: 1)
            )
            .overlay(
                Image(systemName: "sparkle")
                    .font(.system(size: size.width * 0.3))
                    .foregroundStyle(Palette.gold.opacity(0.7))
            )
    }

    private var face: some View {
        RoundedRectangle(cornerRadius: 9, style: .continuous)
            .fill(
                LinearGradient(
                    colors: [Palette.parchment, Color(hex: 0xE9DBB9)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .overlay(
                VStack(spacing: 3) {
                    Text(card.card.label)
                        .font(Typeface.display(size.width * 0.14, weight: .bold))
                        .foregroundStyle(Color(hex: 0x6B4E16))
                    Image(systemName: elementSymbol)
                        .font(.system(size: size.width * 0.26))
                        .foregroundStyle(Color(hex: 0x8A6A22))
                    Text(l(card.card.text.en.name))
                        .font(Typeface.display(size.width * 0.115))
                        .foregroundStyle(Color(hex: 0x3A2A08))
                        .multilineTextAlignment(.center)
                        .minimumScaleFactor(0.6)
                        .lineLimit(2)
                }
                .padding(.horizontal, 5)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .strokeBorder(Color(hex: 0x8A6A22).opacity(0.5), lineWidth: 1)
            )
            .overlay(alignment: .bottomTrailing) {
                if card.reversed {
                    Image(systemName: "arrow.uturn.down")
                        .font(.system(size: size.width * 0.12, weight: .bold))
                        .foregroundStyle(Palette.rose)
                        .padding(4)
                }
            }
            .rotationEffect(.degrees(card.reversed ? 180 : 0))
    }

    private var elementSymbol: String {
        switch card.card.element {
        case "fire": "flame"
        case "water": "drop"
        case "air": "wind"
        case "earth": "leaf"
        default: "star"
        }
    }
}

/// What a turned card says in its position.
private struct CardReading: View {
    let card: DrawnCard

    var body: some View {
        Panel {
            HStack(alignment: .firstTextBaseline) {
                Text(l(card.position.name.en))
                    .font(Typeface.display(15))
                    .tracking(1.6)
                    .foregroundStyle(Palette.gold)
                Spacer()
                if card.reversed {
                    Text(t("tarot.reversed"))
                        .font(Typeface.sans(10, weight: .bold))
                        .tracking(1.6)
                        .foregroundStyle(Palette.rose)
                }
            }
            Text(l(card.card.text.en.name))
                .font(Typeface.display(21))
                .foregroundStyle(Palette.ink)
            Text(l(card.position.question.en))
                .font(Typeface.serif(16))
                .italic()
                .foregroundStyle(Palette.inkMute)
                .fixedSize(horizontal: false, vertical: true)
            FlowRow(spacing: 6) {
                ForEach(keywords, id: \.self) { word in
                    Text(l(word))
                        .font(Typeface.sans(13, weight: .semibold))
                        .foregroundStyle(Palette.inkSoft)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Capsule().fill(Color.white.opacity(0.05)))
                }
            }
        }
    }

    private var keywords: [String] {
        let english = card.reversed ? card.card.text.en.reversed : card.card.text.en.upright
        return l(english.joined(separator: " · ")).components(separatedBy: " · ")
    }
}

private struct CardDetail: View {
    let card: DrawnCard
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Sky()
            VStack(spacing: 18) {
                TarotCardView(card: card, faceUp: true, size: CGSize(width: 150, height: 243))
                CardReading(card: card)
                Spacer()
            }
            .padding(18)
        }
        .presentationBackground(Palette.night)
        .overlay(alignment: .topTrailing) {
            Button { dismiss() } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 26))
                    .foregroundStyle(Palette.inkMute)
                    .padding(14)
            }
        }
    }
}

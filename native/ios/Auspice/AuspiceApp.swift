import SwiftUI

@main
struct AuspiceApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .preferredColorScheme(.dark)
                .tint(Palette.gold)
        }
    }
}

/// The nine practices, in the order the home screen shows them.
enum Practice: String, CaseIterable, Hashable, Identifiable {
    case almanac, tarot, bazi, iching, astrology, fengshui, palm, face, answers

    var id: String { rawValue }

    var name: String {
        switch self {
        case .almanac: "Almanac"
        case .tarot: "Tarot"
        case .bazi: "BaZi"
        case .iching: "I Ching"
        case .astrology: "Astrology"
        case .fengshui: "Feng Shui"
        case .palm: "Palmistry"
        case .face: "Face Reading"
        case .answers: "Book of Answers"
        }
    }

    var chinese: String {
        switch self {
        case .almanac: "黄历"
        case .tarot: "塔罗"
        case .bazi: "八字"
        case .iching: "易经"
        case .astrology: "星盘"
        case .fengshui: "风水"
        case .palm: "手相"
        case .face: "面相"
        case .answers: "答案之书"
        }
    }

    var blurb: String {
        switch self {
        case .almanac: "What today suits, and what it does not"
        case .tarot: "One card, three, or the Celtic cross"
        case .bazi: "Four pillars, from the hour you were born"
        case .iching: "Coins or yarrow, and the lines that change"
        case .astrology: "The sky at your birth, and where it stands now"
        case .fengshui: "Your eight mansions, and the sector you face"
        case .palm: "The hand, measured rather than guessed"
        case .face: "Three courts, five eyes, twelve palaces"
        case .answers: "Ask once. The page falls where it falls"
        }
    }

    var symbol: String {
        switch self {
        case .almanac: "calendar"
        case .tarot: "rectangle.portrait.on.rectangle.portrait.angled"
        case .bazi: "square.grid.2x2"
        case .iching: "line.3.horizontal"
        case .astrology: "circle.dotted"
        case .fengshui: "location.north.circle"
        case .palm: "hand.raised"
        case .face: "face.smiling"
        case .answers: "book.closed"
        }
    }
}

struct RootView: View {
    @State private var path: [Practice] = []
    @State private var router = Router.shared

    var body: some View {
        NavigationStack(path: $path) {
            HomeScreen(open: { path.append($0) })
                .navigationDestination(for: Practice.self) { practice in
                    PracticeScreen(practice: practice)
                }
        }
        .background(Sky())
        // The conversation can send the reader to a screen — the camera, most
        // often, because a palm cannot be read without one.
        .onChange(of: router.requested) { _, requested in
            guard let requested else { return }
            if path.last != requested { path.append(requested) }
            router.requested = nil
        }
    }
}

/// One practice, routed to its own screen.
///
/// Each case here is a real SwiftUI screen. There is no web view anywhere in
/// this app: the interface is native, and only the rules are shared.
struct PracticeScreen: View {
    let practice: Practice

    var body: some View {
        switch practice {
        case .almanac: AlmanacScreen()
        case .tarot: TarotScreen()
        case .bazi: BaziScreen()
        case .iching: IChingScreen()
        case .astrology: AstrologyScreen()
        case .fengshui: FengShuiScreen()
        case .palm: PalmScreen()
        case .face: FaceScreen()
        case .answers: AnswersScreen()
        }
    }
}

/// The shell every screen sits in: the sky, a bounded column, the title.
struct ScreenScaffold<Content: View>: View {
    let eyebrow: String
    let title: String
    var tagline: String?
    @ViewBuilder var content: Content

    var body: some View {
        ZStack {
            Sky()
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    VStack(alignment: .leading, spacing: 6) {
                        Eyebrow(text: eyebrow)
                        Text(title)
                            .font(Typeface.display(34))
                            .foregroundStyle(Palette.ink)
                        if let tagline {
                            Text(tagline)
                                .font(Typeface.serif(19))
                                .italic()
                                .foregroundStyle(Palette.inkSoft)
                        }
                    }
                    .padding(.top, 4)
                    .padding(.bottom, 4)
                    content
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 40)
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
    }
}

import SwiftUI

@main
struct AuspiceApp: App {
    var body: some Scene {
        #if os(macOS)
        Window("LazyOracle", id: "main") {
            DesktopRoot()
                .environment(\.locale, Locale(identifier: Localisation.shared.code))
                .environment(\.layoutDirection, Localisation.shared.layoutDirection)
                .preferredColorScheme(.dark)
                .tint(Palette.gold)
        }
        .defaultSize(width: 1040, height: 800)
        .commands {
            CommandGroup(replacing: .newItem) {
                Button(t("chat.newConversation")) {
                    NotificationCenter.default.post(name: .desktopNewChat, object: nil)
                }
                .keyboardShortcut("n")
                .disabled(ChatStore.shared.streaming)
            }
        }
        #else
        WindowGroup {
            RootView()
                .environment(\.locale, Locale(identifier: Localisation.shared.code))
                .environment(\.layoutDirection, Localisation.shared.layoutDirection)
                .preferredColorScheme(.dark)
                .tint(Palette.gold)
        }
        #endif
    }
}

/// The nine practices, in the order the home screen shows them.
enum Practice: String, CaseIterable, Hashable, Identifiable {
    case almanac, tarot, bazi, iching, astrology, fengshui, palm, face, answers

    var id: String { rawValue }

    var name: String { t("practice.\(rawValue)") }

    var blurb: String { t("blurb.\(rawValue)") }

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
    @State private var restoring = true

    var body: some View {
        NavigationStack(path: $path) {
            HomeScreen(open: { path.append($0) })
                .navigationDestination(for: Practice.self) { practice in
                    PracticeScreen(practice: practice)
                }
        }
        .background(Sky())
        .disabled(restoring)
        .task { await LegacyImport.shared.run(); restoring = false }
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
/// Each case here is a real SwiftUI screen. The interface is native; a hidden local web view is used only once to import
/// the former app’s stored data. The deterministic rules are shared.
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
                .padding(.bottom, 180)
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
            }
            .oracleScrollKeyboard()
        }
        .overlayPreferenceValue(ReadingComposerPreference.self) { composer in
            VStack { Spacer(minLength: 0); composer }
        }
        .oracleInlineTitle()
        .oracleNavigationBar()
        .environment(\.layoutDirection, Localisation.shared.layoutDirection)
    }
}

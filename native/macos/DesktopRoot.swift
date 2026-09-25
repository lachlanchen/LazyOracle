import SwiftUI

/// A single desktop window shares the phone's screens, stores and engines.
struct DesktopRoot: View {
    @SceneStorage("desktop.practice") private var selection: String = "home"
    @State private var router = Router.shared

    var body: some View {
        NavigationSplitView {
            List(selection: Binding<String?>(get: { selection }, set: { selection = $0 ?? "home" })) {
                NavigationLink(value: "home") { Label(t("app.name"), systemImage: "sparkles") }
                    .accessibilityIdentifier("desktop.home")
                NavigationLink(value: "chat") { Label(t("chat.title"), systemImage: "bubble.left.and.bubble.right") }
                    .accessibilityIdentifier("desktop.chat")
                Section {
                    ForEach(Practice.allCases) { practice in
                        NavigationLink(value: practice.rawValue) { Label(practice.name, systemImage: practice.symbol) }
                            .accessibilityIdentifier("desktop.\(practice.rawValue)")
                    }
                }
                NavigationLink(value: "settings") { Label(t("common.settings"), systemImage: "gearshape") }
                    .accessibilityIdentifier("desktop.settings")
            }
            .navigationSplitViewColumnWidth(min: 180, ideal: 210, max: 270)
            .scrollContentBackground(.hidden)
            .background(Palette.night2)
            .foregroundStyle(Palette.ink)
            .listItemTint(Palette.gold)
        } detail: {
            NavigationStack {
                Group {
                    if let practice = Practice(rawValue: selection) {
                        PracticeScreen(practice: practice)
                    } else if selection == "chat" {
                        ChatScreen()
                    } else if selection == "settings" {
                        SettingsScreen()
                    } else {
                        HomeScreen(open: { selection = $0.rawValue })
                    }
                }
                .id(selection)
            }
        }
        .navigationTitle(t("app.name"))
        .textFieldStyle(.plain)
        .buttonStyle(.plain)
        .frame(minWidth: 780, minHeight: 620)
        .onChange(of: router.requested) { _, requested in
            guard let requested else { return }
            selection = requested.rawValue
            router.requested = nil
        }
        .onReceive(NotificationCenter.default.publisher(for: .desktopNewChat)) { _ in
            guard !ChatStore.shared.streaming else { return }
            ChatStore.shared.newSession()
            selection = "chat"
        }
    }
}

extension Notification.Name {
    static let desktopNewChat = Notification.Name("LazyOracle.desktopNewChat")
}

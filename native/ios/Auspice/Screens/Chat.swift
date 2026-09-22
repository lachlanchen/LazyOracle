import SwiftUI

struct ChatScreen: View {
    let opening: String

    var body: some View {
        ScreenScaffold(eyebrow: "Ask", title: "Conversation") {
            Panel { Text("Under construction.").font(Typeface.serif(17)).foregroundStyle(Palette.inkSoft) }
        }
    }
}

struct SettingsScreen: View {
    var body: some View {
        ScreenScaffold(eyebrow: "Settings", title: "Settings") {
            Panel(title: "Rules bundle") {
                Text("\(Engines.shared.available().count) engines loaded")
                    .font(Typeface.serif(17))
                    .foregroundStyle(Palette.inkSoft)
                Text(Engines.shared.available().joined(separator: ", "))
                    .font(Typeface.sans(13))
                    .foregroundStyle(Palette.inkMute)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

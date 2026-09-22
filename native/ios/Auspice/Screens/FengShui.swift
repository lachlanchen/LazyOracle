import SwiftUI

/// Placeholder while this screen is being written natively. Nothing ships to
/// TestFlight with this in it: the build that goes out has every screen drawn.
struct FengShuiScreen: View {
    var body: some View {
        ScreenScaffold(eyebrow: "FengShui", title: "FengShui") {
            Panel { Text("Under construction.").font(Typeface.serif(17)).foregroundStyle(Palette.inkSoft) }
        }
    }
}

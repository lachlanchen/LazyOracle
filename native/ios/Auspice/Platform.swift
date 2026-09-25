import SwiftUI

/// Keep the reading screens shared; only platform chrome differs.
extension View {
    @ViewBuilder func oracleComposerBackground() -> some View {
        #if os(macOS)
        background(Palette.night2.opacity(0.98))
        #else
        background(.ultraThinMaterial)
        #endif
    }
    @ViewBuilder func oracleInlineTitle() -> some View {
        #if os(iOS)
        navigationBarTitleDisplayMode(.inline)
        #else
        self
        #endif
    }

    @ViewBuilder func oracleNavigationBar(hidden: Bool = true) -> some View {
        #if os(iOS)
        toolbarBackground(Palette.night, for: .navigationBar)
            .toolbarBackground(hidden ? .hidden : .visible, for: .navigationBar)
        #else
        self
        #endif
    }

    @ViewBuilder func oracleScrollKeyboard() -> some View {
        #if os(iOS)
        scrollDismissesKeyboard(.interactively)
        #else
        self
        #endif
    }

    @ViewBuilder func oracleNumberKeyboard() -> some View {
        #if os(iOS)
        keyboardType(.numbersAndPunctuation)
        #else
        self
        #endif
    }

    @ViewBuilder func oracleSheetSize() -> some View {
        #if os(macOS)
        frame(minWidth: 500, idealWidth: 560, minHeight: 560, idealHeight: 700)
        #else
        self
        #endif
    }
}

extension ToolbarItemPlacement {
    static var oracleTrailing: ToolbarItemPlacement {
        #if os(macOS)
        .automatic
        #else
        .topBarTrailing
        #endif
    }
}

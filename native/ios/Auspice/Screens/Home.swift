import SwiftUI

struct HomeScreen: View {
    let open: (Practice) -> Void

    @State private var today: AlmanacDay?
    @State private var asking = false
    @State private var draft = ""

    var body: some View {
        ZStack(alignment: .bottom) {
            Sky()
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    header
                    todayStrip
                    grid
                    Text("Every chart, hexagram and draw is computed on this device. Nothing about your birth leaves it unless you ask for a reading in words.")
                        .font(Typeface.sans(12))
                        .foregroundStyle(Palette.inkMute)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 8)
                        .padding(.top, 4)
                        .frame(maxWidth: .infinity)
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 96)
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
            }
            askBar
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
        .onAppear(perform: loadToday)
        .navigationDestination(isPresented: $asking) {
            ChatScreen(opening: draft)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 10) {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [Color(hex: 0xFFE9A8), Palette.gold, Color(hex: 0x7A5C1C)],
                            center: .init(x: 0.35, y: 0.35),
                            startRadius: 1,
                            endRadius: 16
                        )
                    )
                    .frame(width: 22, height: 22)
                    .shadow(color: Palette.gold.opacity(0.45), radius: 9)
                Text("AUSPICE")
                    .font(Typeface.display(17))
                    .tracking(1.4)
                    .foregroundStyle(Palette.ink)
                Spacer()
                NavigationLink { SettingsScreen() } label: {
                    Image(systemName: "gearshape")
                        .font(.system(size: 17))
                        .foregroundStyle(Palette.inkSoft)
                        .frame(width: 44, height: 44)
                }
            }
            .padding(.top, 6)
            Text("宜时")
                .font(Typeface.display(44))
                .foregroundStyle(Palette.ink)
                .padding(.top, 8)
            Text("A sign read from what is actually there.")
                .font(Typeface.serif(19))
                .italic()
                .foregroundStyle(Palette.inkSoft)
        }
        .padding(.bottom, 4)
    }

    @ViewBuilder private var todayStrip: some View {
        if let today {
            Button { open(.almanac) } label: {
                Panel {
                    HStack(alignment: .top, spacing: 12) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text("TODAY")
                                .font(Typeface.sans(11, weight: .bold))
                                .tracking(2)
                                .foregroundStyle(Palette.gold)
                            Text(today.lunar.text)
                                .font(Typeface.display(17))
                                .foregroundStyle(Palette.ink)
                            Text("\(today.lunar.dayGanZhi)日 · \(today.dayOfficer)日")
                                .font(Typeface.sans(13))
                                .foregroundStyle(Palette.inkMute)
                        }
                        Spacer(minLength: 8)
                        VStack(alignment: .leading, spacing: 5) {
                            miniTerms("宜", today.yi, Palette.gold)
                            miniTerms("忌", today.ji, Palette.rose)
                        }
                        .frame(maxWidth: 150, alignment: .leading)
                    }
                }
            }
            .buttonStyle(.plain)
        }
    }

    private func miniTerms(_ mark: String, _ terms: [String], _ colour: Color) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 7) {
            Text(mark)
                .font(Typeface.display(15))
                .foregroundStyle(colour)
            Text(terms.prefix(3).joined(separator: " ") + (terms.count > 3 ? " …" : ""))
                .font(Typeface.serif(15))
                .foregroundStyle(Palette.inkSoft)
                .lineLimit(1)
        }
    }

    private var grid: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
            ForEach(Practice.allCases) { practice in
                Button { open(practice) } label: {
                    tile(practice)
                }
                .buttonStyle(TileButtonStyle())
                .gridCellColumns(practice == .tarot ? 2 : 1)
            }
        }
    }

    private func tile(_ practice: Practice) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: practice.symbol)
                .font(.system(size: 17))
                .foregroundStyle(Palette.gold)
                .frame(width: 38, height: 38)
                .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Palette.gold.opacity(0.15)))
            Text(practice.name)
                .font(Typeface.display(19))
                .foregroundStyle(Palette.ink)
                .padding(.top, 2)
            Text(practice.blurb)
                .font(Typeface.serif(15))
                .foregroundStyle(Palette.inkSoft)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, minHeight: practice == .tarot ? 150 : 132, alignment: .topLeading)
        .padding(.horizontal, 14)
        .padding(.vertical, 16)
        .background(tileBackground(practice))
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .strokeBorder(practice == .tarot ? Palette.goldLine : Palette.line, lineWidth: 1)
        )
        .overlay(alignment: .topTrailing) {
            Text(practice.chinese)
                .font(Typeface.serif(14))
                .foregroundStyle(Palette.inkMute)
                .padding(12)
        }
    }

    private func tileBackground(_ practice: Practice) -> some ShapeStyle {
        practice == .tarot
            ? AnyShapeStyle(LinearGradient(
                colors: [Palette.gold.opacity(0.18), Palette.rose.opacity(0.08), Color.white.opacity(0.02)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ))
            : AnyShapeStyle(LinearGradient(
                colors: [Color.white.opacity(0.07), Color.white.opacity(0.02)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ))
    }

    /// The ask bar, pinned to the bottom above the home indicator. Tapping it
    /// opens the conversation, carrying whatever has been typed.
    private var askBar: some View {
        HStack(spacing: 10) {
            Image(systemName: "sparkles")
                .foregroundStyle(Palette.gold)
            TextField("Ask about today, a chart, a card…", text: $draft)
                .font(Typeface.sans(16))
                .foregroundStyle(Palette.ink)
                .submitLabel(.send)
                .onSubmit { asking = true }
            Button { asking = true } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(Palette.gold)
            }
            .accessibilityLabel("Ask")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial, in: Capsule())
        .overlay(Capsule().strokeBorder(Palette.goldLine, lineWidth: 1))
        .padding(.horizontal, 18)
        .padding(.bottom, 10)
    }

    private func loadToday() {
        guard today == nil else { return }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        today = try? Engines.shared.evaluate("almanac.day", ["date": formatter.string(from: Date())], as: AlmanacDay.self)
    }
}

/// Tiles lift very slightly when pressed, the way the web tiles lift on hover.
struct TileButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.18), value: configuration.isPressed)
    }
}

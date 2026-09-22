import SwiftUI

/// The one place colour, type and motion are defined.
///
/// The values are the same tokens the web app uses in `src/index.css`, so the
/// two apps are recognisably the same product; everything below this line is
/// native, drawn by SwiftUI rather than by a style sheet.
enum Palette {
    static let night = Color(hex: 0x0B0D1F)
    static let night2 = Color(hex: 0x131634)
    static let night3 = Color(hex: 0x1C1F45)
    static let ink = Color(hex: 0xF4EFE4)
    static let inkSoft = Color(hex: 0xF4EFE4, alpha: 0.72)
    static let inkMute = Color(hex: 0xF4EFE4, alpha: 0.50)
    static let gold = Color(hex: 0xD9B45A)
    static let goldSoft = Color(hex: 0xD9B45A, alpha: 0.22)
    static let goldLine = Color(hex: 0xD9B45A, alpha: 0.45)
    static let rose = Color(hex: 0xE28B7A)
    static let parchment = Color(hex: 0xF3E9D2)
    static let line = Color(hex: 0xF4EFE4, alpha: 0.12)
}

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: alpha
        )
    }
}

enum Typeface {
    /// Headings. The web app sets Cinzel; on the device the serif design gives
    /// the same weight of voice without shipping a font file.
    static func display(_ size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .serif)
    }

    /// Body prose, and every reading the app narrates.
    static func serif(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .serif)
    }

    /// Labels, eyebrows and controls.
    static func sans(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight)
    }
}

/// An eyebrow: small, gold, letterspaced, above a heading.
struct Eyebrow: View {
    let text: String

    var body: some View {
        Text(text.uppercased())
            .font(Typeface.sans(12, weight: .bold))
            .tracking(2.6)
            .foregroundStyle(Palette.gold)
    }
}

/// The bordered, faintly lit card every section of the app sits in.
struct Panel<Content: View>: View {
    var title: String?
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let title {
                Text(title.uppercased())
                    .font(Typeface.display(15))
                    .tracking(2.1)
                    .foregroundStyle(Palette.gold)
            }
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(
            LinearGradient(
                colors: [Color.white.opacity(0.05), Color.white.opacity(0.02)],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .strokeBorder(Palette.line, lineWidth: 1)
        )
    }
}

/// The gold call to action: draw the cards, cast the lines, open the book.
struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Typeface.sans(16, weight: .heavy))
            .foregroundStyle(Color(hex: 0x1A1405))
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(
                LinearGradient(
                    colors: [Color(hex: 0xE6C777), Palette.gold, Color(hex: 0xB48B35)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .shadow(color: Palette.gold.opacity(0.22), radius: 15, y: 10)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

/// The quieter outlined button beside it.
struct GhostButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Typeface.sans(14, weight: .bold))
            .foregroundStyle(Palette.gold)
            .padding(.horizontal, 16)
            .frame(minHeight: 44)
            .overlay(Capsule().strokeBorder(Palette.goldLine, lineWidth: 1))
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}

/// A selectable pill: the spread, the method, the undertaking.
struct Chip: View {
    let label: String
    var detail: String?
    let active: Bool
    let tap: () -> Void

    var body: some View {
        Button(action: tap) {
            HStack(spacing: 7) {
                Text(label)
                if let detail {
                    Text(detail).foregroundStyle(active ? Palette.gold : Palette.inkMute)
                }
            }
            .font(Typeface.sans(14, weight: .semibold))
            .foregroundStyle(active ? Palette.ink : Palette.inkSoft)
            .padding(.horizontal, 14)
            .frame(minHeight: 40)
            .background(Capsule().fill(active ? Palette.goldSoft : Color.white.opacity(0.04)))
            .overlay(Capsule().strokeBorder(active ? Palette.goldLine : Palette.line, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

/// The small uppercase label above a field.
struct FieldLabel: View {
    let text: String

    init(_ text: String) { self.text = text }

    var body: some View {
        Text(text.uppercased())
            .font(Typeface.sans(12, weight: .bold))
            .tracking(2.1)
            .foregroundStyle(Palette.inkMute)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 4)
    }
}

/// Text fields: serif, roomy, and never under sixteen points — the smaller
/// sizes are what made Safari zoom the web app when a field took focus.
struct AuspiceFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .font(Typeface.serif(18))
            .foregroundStyle(Palette.ink)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color.black.opacity(0.25)))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(Palette.line, lineWidth: 1)
            )
    }
}

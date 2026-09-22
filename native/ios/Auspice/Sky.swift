import SwiftUI

/// The night behind every screen.
///
/// The web app paints this with layered radial gradients and drifts the
/// background position for ninety seconds. Here the stars are real points on a
/// Canvas, which costs less than a full-screen gradient stack and lets them
/// twinkle: each star has its own phase, so the sky never pulses as one.
struct Sky: View {
    private struct Star {
        let x: Double
        let y: Double
        let radius: Double
        let phase: Double
        let gold: Bool
    }

    /// Fixed, not random at launch: the same sky every time the app opens is
    /// part of recognising the place.
    private static let stars: [Star] = {
        var generator = SeededGenerator(seed: 0x5EED_FACE_1234_5678)
        return (0..<110).map { index in
            Star(
                x: Double.random(in: 0...1, using: &generator),
                y: Double.random(in: 0...1, using: &generator),
                radius: Double.random(in: 0.5...1.6, using: &generator),
                phase: Double.random(in: 0...(2 * .pi), using: &generator),
                gold: index % 7 == 0
            )
        }
    }()

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            LinearGradient(
                stops: [
                    .init(color: Color(hex: 0x0D1026), location: 0),
                    .init(color: Palette.night, location: 0.45),
                    .init(color: Color(hex: 0x07081A), location: 1)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            RadialGradient(
                colors: [Color(hex: 0x23265A), .clear],
                center: .init(x: 0.5, y: -0.1),
                startRadius: 0,
                endRadius: 420
            )
            TimelineView(.animation(minimumInterval: reduceMotion ? 3600 : 1.0 / 30)) { timeline in
                Canvas { context, size in
                    let t = reduceMotion ? 0 : timeline.date.timeIntervalSinceReferenceDate
                    // A ninety-second drift upward, the same period as the web app.
                    let drift = reduceMotion ? 0 : (t / 90).truncatingRemainder(dividingBy: 1) * 60
                    for star in Self.stars {
                        let twinkle = reduceMotion ? 0.7 : 0.55 + 0.35 * sin(t * 0.7 + star.phase)
                        let y = (star.y * size.height - drift).truncatingRemainder(dividingBy: size.height)
                        let rect = CGRect(
                            x: star.x * size.width - star.radius,
                            y: (y < 0 ? y + size.height : y) - star.radius,
                            width: star.radius * 2,
                            height: star.radius * 2
                        )
                        context.fill(
                            Path(ellipseIn: rect),
                            with: .color(star.gold ? Palette.gold.opacity(twinkle) : .white.opacity(twinkle * 0.9))
                        )
                    }
                }
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }
}

/// A tiny reproducible generator, so the sky is the same on every device.
struct SeededGenerator: RandomNumberGenerator {
    private var state: UInt64

    init(seed: UInt64) {
        state = seed == 0 ? 0x9E37_79B9_7F4A_7C15 : seed
    }

    mutating func next() -> UInt64 {
        state ^= state << 13
        state ^= state >> 7
        state ^= state << 17
        return state
    }
}

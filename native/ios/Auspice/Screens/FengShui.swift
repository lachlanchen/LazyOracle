import SwiftUI
import CoreLocation

/// The device compass, for "which sector am I facing".
@Observable
final class Compass: NSObject, CLLocationManagerDelegate {
    var heading: Double?
    var available = CLLocationManager.headingAvailable()
    var denied = false

    private let manager = CLLocationManager()

    override init() {
        super.init()
        manager.delegate = self
        manager.headingFilter = 1
    }

    func start() {
        guard available else { return }
        if manager.authorizationStatus == .notDetermined {
            manager.requestWhenInUseAuthorization()
        }
        denied = manager.authorizationStatus == .denied || manager.authorizationStatus == .restricted
        manager.startUpdatingHeading()
    }

    func stop() {
        manager.stopUpdatingHeading()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        guard newHeading.headingAccuracy >= 0 else { return }
        heading = newHeading.magneticHeading
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        denied = manager.authorizationStatus == .denied || manager.authorizationStatus == .restricted
        if manager.authorizationStatus == .authorizedWhenInUse || manager.authorizationStatus == .authorizedAlways {
            manager.startUpdatingHeading()
        }
    }
}

struct FengShuiScreen: View {
    @State private var store = ProfileStore.shared
    @State private var compass = Compass()
    @State private var mansions: EightMansions?
    @State private var facing: String?
    @State private var error: String?
    @State private var editing = false

    var body: some View {
        ScreenScaffold(
            eyebrow: "风水 · Eight Mansions",
            title: "Your eight sectors",
            tagline: "八宅: the gua of your birth year decides which way is good for you."
        ) {
            BirthSummary(profile: store.profile) { editing = true }

            if let error {
                Panel(title: "Not computed") {
                    Text(error).font(Typeface.serif(16)).foregroundStyle(Palette.inkSoft)
                }
            }

            if let mansions {
                Panel {
                    BaguaRose(mansions: mansions, heading: compass.heading)
                        .aspectRatio(1, contentMode: .fit)
                        .frame(maxWidth: .infinity)
                    compassLine
                }

                Panel(title: "Your gua") {
                    HStack(alignment: .firstTextBaseline, spacing: 12) {
                        Text(mansions.gua)
                            .font(Typeface.display(40))
                            .foregroundStyle(Palette.gold)
                        VStack(alignment: .leading, spacing: 3) {
                            Text("\(mansions.guaNumber) · \(mansions.group == "east" ? "East group 东四命" : "West group 西四命")")
                                .font(Typeface.display(18))
                                .foregroundStyle(Palette.ink)
                            Text("Counted from the BaZi year \(mansions.year), which begins at 立春 rather than on 1 January.")
                                .font(Typeface.serif(15))
                                .foregroundStyle(Palette.inkMute)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    HStack(spacing: 10) {
                        badge("Best", mansions.best, Palette.gold)
                        badge("Worst", mansions.worst, Palette.rose)
                    }
                }

                Panel(title: "The eight sectors") {
                    ForEach(mansions.sectors) { sector in
                        sectorRow(sector)
                        if sector.id != mansions.sectors.last?.id {
                            Divider().overlay(Palette.line)
                        }
                    }
                }
            }
        }
        .sheet(isPresented: $editing) {
            BirthForm(profile: $store.profile) { compute() }
        }
        .onAppear {
            compute()
            compass.start()
        }
        .onDisappear { compass.stop() }
        .onChange(of: compass.heading) { _, heading in
            guard let heading else { return }
            facing = try? Engines.shared.evaluate(
                "fengshui.sector", ["heading": heading], as: String.self
            )
        }
    }

    @ViewBuilder private var compassLine: some View {
        if !compass.available {
            Text("This device has no compass, so the sectors are shown without a facing.")
                .font(Typeface.sans(13))
                .foregroundStyle(Palette.inkMute)
                .frame(maxWidth: .infinity)
        } else if compass.denied {
            Text("The compass needs location permission. The sectors below are still yours.")
                .font(Typeface.sans(13))
                .foregroundStyle(Palette.inkMute)
                .frame(maxWidth: .infinity)
        } else if let heading = compass.heading, let facing, let quality = mansions?.sectors.first(where: { $0.direction == facing })?.quality {
            VStack(spacing: 4) {
                Text(String(format: "Facing %@ · %.0f°", facing, heading))
                    .font(Typeface.display(18))
                    .foregroundStyle(Palette.ink)
                Text("\(quality.name.zh) \(quality.name.en)")
                    .font(Typeface.serif(17))
                    .foregroundStyle(quality.auspicious ? Palette.gold : Palette.rose)
                Text(quality.use.en)
                    .font(Typeface.serif(15))
                    .foregroundStyle(Palette.inkSoft)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 4)
        }
    }

    private func badge(_ label: String, _ direction: String, _ colour: Color) -> some View {
        HStack(spacing: 6) {
            Text(label.uppercased())
                .font(Typeface.sans(10, weight: .bold))
                .tracking(1.4)
                .foregroundStyle(Palette.inkMute)
            Text(direction)
                .font(Typeface.display(17))
                .foregroundStyle(colour)
        }
        .padding(.horizontal, 12)
        .frame(minHeight: 40)
        .background(Capsule().fill(colour.opacity(0.14)))
        .overlay(Capsule().strokeBorder(colour.opacity(0.4), lineWidth: 1))
    }

    private func sectorRow(_ sector: MansionSector) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(sector.direction)
                .font(Typeface.display(18))
                .foregroundStyle(sector.quality.auspicious ? Palette.gold : Palette.rose)
                .frame(width: 34, alignment: .leading)
            VStack(alignment: .leading, spacing: 3) {
                Text("\(sector.quality.name.zh) · \(sector.quality.name.en)")
                    .font(Typeface.serif(17))
                    .foregroundStyle(Palette.ink)
                Text(sector.quality.use.en)
                    .font(Typeface.serif(15))
                    .foregroundStyle(Palette.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
                Text(sector.quality.use.zh)
                    .font(Typeface.serif(14))
                    .foregroundStyle(Palette.inkMute)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 6)
    }

    private func compute() {
        guard store.profile.isComplete else { mansions = nil; return }
        do {
            mansions = try Engines.shared.evaluate("fengshui.mansions", [
                "year": store.profile.year,
                "month": store.profile.month,
                "day": store.profile.day,
                "gender": store.profile.gender
            ], as: EightMansions.self)
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}

/// The eight directions as a rose, each wedge coloured by its quality, with
/// the device's heading as a needle over it.
struct BaguaRose: View {
    let mansions: EightMansions
    let heading: Double?

    private let order = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

    var body: some View {
        GeometryReader { geometry in
            let size = min(geometry.size.width, geometry.size.height)
            let centre = CGPoint(x: geometry.size.width / 2, y: geometry.size.height / 2)
            let outer = size * 0.46
            let inner = size * 0.19

            ZStack {
                Canvas { context, _ in
                    for (index, direction) in order.enumerated() {
                        guard let sector = mansions.sectors.first(where: { $0.direction == direction }) else { continue }
                        let start = Angle(degrees: Double(index) * 45 - 22.5 - 90)
                        let end = Angle(degrees: Double(index) * 45 + 22.5 - 90)
                        var path = Path()
                        path.move(to: centre)
                        path.addArc(center: centre, radius: outer, startAngle: start, endAngle: end, clockwise: false)
                        path.closeSubpath()
                        context.fill(
                            path,
                            with: .color(sector.quality.auspicious
                                         ? Palette.gold.opacity(sector.direction == mansions.best ? 0.34 : 0.17)
                                         : Palette.rose.opacity(sector.direction == mansions.worst ? 0.3 : 0.13))
                        )
                        context.stroke(path, with: .color(Palette.line), lineWidth: 1)
                    }
                    context.fill(
                        Path(ellipseIn: CGRect(x: centre.x - inner, y: centre.y - inner, width: inner * 2, height: inner * 2)),
                        with: .color(Palette.night)
                    )
                    context.stroke(
                        Path(ellipseIn: CGRect(x: centre.x - inner, y: centre.y - inner, width: inner * 2, height: inner * 2)),
                        with: .color(Palette.goldLine),
                        lineWidth: 1
                    )
                }

                ForEach(Array(order.enumerated()), id: \.element) { index, direction in
                    let angle = Double(index) * 45 - 90
                    let radius = (outer + inner) / 2
                    VStack(spacing: 1) {
                        Text(direction)
                            .font(Typeface.display(size * 0.055))
                            .foregroundStyle(Palette.ink)
                        if let sector = mansions.sectors.first(where: { $0.direction == direction }) {
                            Text(sector.quality.name.zh)
                                .font(Typeface.serif(size * 0.045))
                                .foregroundStyle(Palette.inkSoft)
                        }
                    }
                    .position(
                        x: centre.x + cos(angle * .pi / 180) * radius,
                        y: centre.y + sin(angle * .pi / 180) * radius
                    )
                }

                Text(mansions.gua)
                    .font(Typeface.display(size * 0.12))
                    .foregroundStyle(Palette.gold)
                    .position(centre)

                if let heading {
                    Needle()
                        .fill(Palette.gold)
                        .frame(width: size * 0.05, height: outer * 0.95)
                        .position(x: centre.x, y: centre.y - outer * 0.475)
                        .rotationEffect(.degrees(-heading), anchor: .center)
                        .shadow(color: Palette.gold.opacity(0.6), radius: 6)
                        .animation(.easeOut(duration: 0.25), value: heading)
                }
            }
        }
    }

    private struct Needle: Shape {
        func path(in rect: CGRect) -> Path {
            var path = Path()
            path.move(to: CGPoint(x: rect.midX, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
            path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
            path.closeSubpath()
            return path
        }
    }
}

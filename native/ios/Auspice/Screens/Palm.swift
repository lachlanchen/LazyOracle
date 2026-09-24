import SwiftUI

struct PalmScreen: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var camera = LandmarkSession(kind: .hand)
    @SavedPractice("palm.lines") private var lines = LineTraits()
    @SavedPractice("palm.features") private var features: PalmFeatures? = nil
    @State private var error: String?
    @SavedPractice("palm.captured") private var captured = false

    private let fingerNames = [
        "jupiter": "Index finger", "saturn": "Middle finger",
        "apollo": "Ring finger", "mercury": "Little finger"
    ]

    var body: some View {
        ScreenScaffold(
            eyebrow: t("practice.palm"),
            title: t("palm.title"),
            tagline: t("palm.tagline")
        ) {
            Panel {
                ZStack {
                    CameraView(session: camera.session, mirrored: camera.position == .front)
                    LandmarkOverlay(points: camera.overlay, joined: true, imageAspect: camera.imageAspect)
                    if !camera.detecting {
                        Text(t("palm.hint"))
                            .font(Typeface.serif(17))
                            .foregroundStyle(Palette.ink)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(Capsule().fill(.black.opacity(0.45)))
                    }
                }
                .frame(height: 320)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(alignment: .topTrailing) { CameraFlipButton(session: camera) }
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(camera.detecting ? Palette.goldLine : Palette.line, lineWidth: 1)
                )
                if let message = camera.message {
                    Text(message).font(Typeface.sans(13)).foregroundStyle(Palette.inkMute)
                }
                Text(t(camera.ready ? "vision.ready" : "vision.hold")).font(Typeface.sans(13)).foregroundStyle(Palette.inkMute)
                Button(action: read) {
                    Label(captured ? t("palm.readAgain") : t("palm.read"), systemImage: "hand.raised")
                }
                .buttonStyle(PrimaryButtonStyle())
                .accessibilityIdentifier("palm.measure")
                .disabled(!camera.ready)
                .opacity(camera.ready ? 1 : 0.5)
                Text(t("face.privacy")).font(Typeface.sans(12)).foregroundStyle(Palette.inkMute).fixedSize(horizontal: false, vertical: true)
            }

            Panel(title: t("palm.lines")) {
                Text(t("palm.linesNote"))
                    .font(Typeface.serif(16))
                    .foregroundStyle(Palette.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
                lineChoice(l("Heart line ends"), ["unsure": "Not sure", "index": "Under the index", "middle": "Under the middle", "between": "Between them"], $lines.heart)
                lineChoice(l("Head line"), ["unsure": "Not sure", "straight": "Straight", "curved": "Curved"], $lines.head)
                lineChoice(l("Life line"), ["unsure": "Not sure", "wide": "Sweeps wide", "close": "Hugs the thumb"], $lines.life)
                lineChoice(l("Fate line"), ["present": "Present", "absent": "Absent", "unsure": "Not sure"], $lines.fate)
            }

            if let error {
                Panel(title: t("common.notComputed")) {
                    Text(error).font(Typeface.serif(16)).foregroundStyle(Palette.inkSoft)
                }
            }

            if let features {
                Panel(title: t("vision.measurement")) {
                    Text(t(features.measurement == nil ? "vision.legacy" : "vision.measured"))
                        .font(Typeface.sans(14)).foregroundStyle(Palette.inkSoft)
                    if let measurement = features.measurement, measurement.typeCandidates.count > 1 {
                        Text(measurement.typeCandidates.map { l($0.capitalized) }.joined(separator: " / "))
                            .font(Typeface.serif(17)).foregroundStyle(Palette.gold)
                        Text(t("vision.boundary")).font(Typeface.sans(13)).foregroundStyle(Palette.inkMute)
                    }
                }
                Panel(title: t("palm.hand")) {
                    measure(l("Shape"), shapeWord(features.shape))
                    measure(l("Palm width to length"), String(format: "%.2f", features.palmRatio))
                    measure(l("Fingers to palm"), String(format: "%.2f", features.fingerRatio))
                    measure(l("Index to ring"), String(format: "%.2f", features.indexToRing))
                    measure(l("Thumb angle"), String(format: "%.0f°", features.thumbAngle))
                    measure(l("Openness"), String(format: "%.2f", features.openness))
                }

                Panel(title: t("palm.fingers")) {
                    ForEach(features.fingers) { finger in
                        HStack(spacing: 10) {
                            Text(l(fingerNames[finger.finger] ?? finger.finger))
                                .font(Typeface.serif(16))
                                .foregroundStyle(Palette.ink)
                            Spacer(minLength: 0)
                            Text(visionState(finger.length))
                                .font(Typeface.sans(13, weight: .semibold))
                                .foregroundStyle(Palette.gold)
                            Text(String(format: "%.2f", finger.ratioToSaturn))
                                .font(Typeface.sans(13))
                                .foregroundStyle(Palette.inkMute)
                        }
                        .padding(.vertical, 4)
                    }
                }

                Panel(title: t("common.method")) {
                    Text(t("vision.palmMethod"))
                        .font(Typeface.serif(16))
                        .foregroundStyle(Palette.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }
                ExplainReading(result: features)
            }
        }
        .onAppear { Router.shared.palm = features; camera.start() }
        .onDisappear { camera.stop() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { camera.start() } else { camera.stop() }
        }
    }

    private func lineChoice(_ label: String, _ options: [String: String], _ binding: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            FieldLabel(label)
            FlowRow(spacing: 8) {
                ForEach(options.sorted(by: { $0.key < $1.key }), id: \.key) { key, title in
                    Chip(label: l(title), active: binding.wrappedValue == key) {
                        binding.wrappedValue = key
                        if var saved = features { saved.lines = lines; features = saved; Router.shared.palm = saved }
                    }
                }
            }
        }
    }

    private func measure(_ label: String, _ value: String) -> some View {
        HStack {
            Text(l(label)).font(Typeface.serif(16)).foregroundStyle(Palette.inkSoft)
            Spacer()
            Text(l(value)).font(Typeface.sans(15, weight: .semibold)).foregroundStyle(Palette.ink)
        }
        .padding(.vertical, 3)
    }

    private func shapeWord(_ shape: String) -> String {
        shape == "mixed" ? t("vision.mixed") : l(shape.capitalized)
    }

    private func read() {
        let frames = camera.captureFrames()
        guard !frames.isEmpty else { error = t("vision.hold"); return }
        do {
            let measured = try Engines.shared.evaluate(
                "palm.capture",
                ["frames": frames, "lines": lines.dictionary],
                as: PalmFeatures.self
            )
            features = measured
            Router.shared.palm = measured
            error = nil
            captured = true
        } catch {
            self.error = visionError(error)
        }
    }
}

import SwiftUI

struct FaceScreen: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var camera = LandmarkSession(kind: .face)
    @SavedPractice("face.features") private var features: FaceFeatures? = nil
    @State private var error: String?
    @SavedPractice("face.captured") private var captured = false

    private let courtNames = ["upper": "Upper court", "middle": "Middle court", "lower": "Lower court"]
    private let elementNames = [
        "wood": "Wood", "fire": "Fire", "earth": "Earth",
        "metal": "Metal", "water": "Water"
    ]

    var body: some View {
        ScreenScaffold(
            eyebrow: t("practice.face"),
            title: t("face.title"),
            tagline: t("face.tagline")
        ) {
            Panel {
                ZStack {
                    CameraView(session: camera.session)
                    LandmarkOverlay(points: camera.overlay, joined: false)
                    if !camera.detecting {
                        Text(t("face.hint"))
                            .font(Typeface.serif(17))
                            .foregroundStyle(Palette.ink)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(Capsule().fill(.black.opacity(0.45)))
                    }
                }
                .frame(height: 360)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(alignment: .topTrailing) { CameraFlipButton(session: camera) }
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(camera.detecting ? Palette.goldLine : Palette.line, lineWidth: 1)
                )
                if let message = camera.message {
                    Text(message).font(Typeface.sans(13)).foregroundStyle(Palette.inkMute)
                }
                Button(action: read) {
                    Label(captured ? t("palm.readAgain") : t("face.read"), systemImage: "face.smiling")
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(!camera.detecting)
                .opacity(camera.detecting ? 1 : 0.5)
                Text(t("face.privacy"))
                    .font(Typeface.sans(12))
                    .foregroundStyle(Palette.inkMute)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if let error {
                Panel(title: t("common.notComputed")) {
                    Text(error).font(Typeface.serif(16)).foregroundStyle(Palette.inkSoft)
                }
            }

            if let features {
                Panel(title: t("face.element")) {
                    Text(l(elementNames[features.element] ?? features.element))
                        .font(Typeface.display(28))
                        .foregroundStyle(Palette.gold)
                    Text(l("Read from the height of the face against its width, and from how the jaw and forehead stand against the cheekbones."))
                        .font(Typeface.serif(16))
                        .foregroundStyle(Palette.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Panel(title: t("face.courts")) {
                    ForEach(features.courts) { court in
                        HStack(spacing: 10) {
                            Text(l(courtNames[court.court] ?? court.court))
                                .font(Typeface.serif(16))
                                .foregroundStyle(Palette.ink)
                                .frame(width: 148, alignment: .leading)
                            GeometryReader { geometry in
                                ZStack(alignment: .leading) {
                                    Capsule().fill(Color.white.opacity(0.06))
                                    Capsule()
                                        .fill(court.state == "even" ? Palette.gold : Palette.rose)
                                        .frame(width: geometry.size.width * min(1, court.share * 2.4))
                                }
                            }
                            .frame(height: 7)
                            Text("\(Int((court.share * 100).rounded()))%")
                                .font(Typeface.sans(12))
                                .foregroundStyle(Palette.inkMute)
                                .frame(width: 38, alignment: .trailing)
                        }
                        .padding(.vertical, 4)
                    }
                    Text(l("Each court occupies one third of an evenly proportioned face. The upper court represents early life, the middle court the middle years, and the lower court later life."))
                        .font(Typeface.sans(13))
                        .foregroundStyle(Palette.inkMute)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Panel(title: t("face.proportion")) {
                    measure(l("Eyes across the face"), String(format: "%.2f", features.eyesAcross), ideal: "5.00")
                    measure(l("Gap between the eyes"), String(format: "%.2f", features.eyeGap), ideal: "1.00")
                    measure(l("Height to width"), String(format: "%.2f", features.heightRatio), ideal: nil)
                    measure(l("Jaw to cheekbones"), String(format: "%.2f", features.jawRatio), ideal: nil)
                    measure(l("Forehead to cheekbones"), String(format: "%.2f", features.foreheadRatio), ideal: nil)
                    measure(l("Symmetry"), String(format: "%.3f", features.symmetry), ideal: "1.000")
                }

                Panel(title: t("face.palaces")) {
                    ForEach(features.palaces) { palace in
                        HStack(spacing: 10) {
                            Text(l(palace.palace))
                                .font(Typeface.serif(17))
                                .foregroundStyle(palace.state == "generous" ? Palette.gold : Palette.ink)
                                .frame(width: 68, alignment: .leading)
                            Text(l(palace.state))
                                .font(Typeface.sans(13, weight: .semibold))
                                .foregroundStyle(Palette.inkSoft)
                            Spacer(minLength: 0)
                            Text(String(format: "%.2f", palace.value))
                                .font(Typeface.sans(13))
                                .foregroundStyle(Palette.inkMute)
                        }
                        .padding(.vertical, 3)
                    }
                    if !features.strongPalaces.isEmpty {
                        Text(lf("Standing out: {0}", features.strongPalaces.map(l).joined(separator: " · ")))
                            .font(Typeface.serif(16))
                            .foregroundStyle(Palette.gold)
                            .padding(.top, 4)
                    }
                }

                Panel(title: t("common.method")) {
                    Text(l("The three-court, five-eye method divides the face at the hairline, brows, base of the nose and chin. Width is measured in eye-widths. Eight facial regions can be measured from landmarks; the other four are not assessed."))
                        .font(Typeface.serif(16))
                        .foregroundStyle(Palette.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }
                ExplainReading(result: features)
            }
        }
        .onAppear { Router.shared.face = features; camera.start() }
        .onDisappear { camera.stop() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { camera.start() } else { camera.stop() }
        }
    }

    private func measure(_ label: String, _ value: String, ideal: String?) -> some View {
        HStack {
            Text(l(label)).font(Typeface.serif(16)).foregroundStyle(Palette.inkSoft)
            Spacer()
            if let ideal {
                Text(lf("Reference: {0}", ideal))
                    .font(Typeface.sans(12))
                    .foregroundStyle(Palette.inkMute)
            }
            Text(l(value))
                .font(Typeface.sans(15, weight: .semibold))
                .foregroundStyle(Palette.ink)
                .frame(width: 58, alignment: .trailing)
        }
        .padding(.vertical, 3)
    }

    private func read() {
        let points = camera.landmarks
        guard points.count >= 400 else { error = l("No face is in view."); return }
        do {
            let measured = try Engines.shared.evaluate("face.features", ["landmarks": points], as: FaceFeatures.self)
            features = measured
            Router.shared.face = measured
            error = nil
            captured = true
        } catch {
            self.error = l("This reading could not be computed. Please try again.")
        }
    }
}

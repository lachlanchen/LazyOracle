import SwiftUI

struct FaceScreen: View {
    @State private var camera = LandmarkSession(kind: .face)
    @State private var features: FaceFeatures?
    @State private var error: String?
    @State private var captured = false

    private let courtNames = ["upper": "上停 Upper court", "middle": "中停 Middle court", "lower": "下停 Lower court"]
    private let elementNames = [
        "wood": "木形 Wood", "fire": "火形 Fire", "earth": "土形 Earth",
        "metal": "金形 Metal", "water": "水形 Water"
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
                    Text(elementNames[features.element] ?? features.element)
                        .font(Typeface.display(28))
                        .foregroundStyle(Palette.gold)
                    Text("Read from the height of the face against its width, and from how the jaw and forehead stand against the cheekbones.")
                        .font(Typeface.serif(16))
                        .foregroundStyle(Palette.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Panel(title: t("face.courts")) {
                    ForEach(features.courts) { court in
                        HStack(spacing: 10) {
                            Text(courtNames[court.court] ?? court.court)
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
                    Text("An even face gives each court a third. 上停 is judged for early life, 中停 for the middle years, 下停 for the later ones.")
                        .font(Typeface.sans(13))
                        .foregroundStyle(Palette.inkMute)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Panel(title: t("face.proportion")) {
                    measure("Eyes across the face", String(format: "%.2f", features.eyesAcross), ideal: "5.00")
                    measure("Gap between the eyes", String(format: "%.2f", features.eyeGap), ideal: "1.00")
                    measure("Height to width", String(format: "%.2f", features.heightRatio), ideal: nil)
                    measure("Jaw to cheekbones", String(format: "%.2f", features.jawRatio), ideal: nil)
                    measure("Forehead to cheekbones", String(format: "%.2f", features.foreheadRatio), ideal: nil)
                    measure("Symmetry", String(format: "%.3f", features.symmetry), ideal: "1.000")
                }

                Panel(title: t("face.palaces")) {
                    ForEach(features.palaces) { palace in
                        HStack(spacing: 10) {
                            Text(palace.palace)
                                .font(Typeface.serif(17))
                                .foregroundStyle(palace.state == "generous" ? Palette.gold : Palette.ink)
                                .frame(width: 68, alignment: .leading)
                            Text(palace.state)
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
                        Text("Standing out: " + features.strongPalaces.joined(separator: "、"))
                            .font(Typeface.serif(16))
                            .foregroundStyle(Palette.gold)
                            .padding(.top, 4)
                    }
                }

                Panel(title: t("common.method")) {
                    Text("三停五眼: the face is divided at the hairline, the brows, the base of the nose and the chin, and its width is counted in eye-widths. Eight of the twelve palaces are measured here; the rest ask for things a landmark mesh cannot see, and the app does not pretend otherwise.")
                        .font(Typeface.serif(16))
                        .foregroundStyle(Palette.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .onAppear { camera.start() }
        .onDisappear { camera.stop() }
    }

    private func measure(_ label: String, _ value: String, ideal: String?) -> some View {
        HStack {
            Text(label).font(Typeface.serif(16)).foregroundStyle(Palette.inkSoft)
            Spacer()
            if let ideal {
                Text("ideal \(ideal)")
                    .font(Typeface.sans(12))
                    .foregroundStyle(Palette.inkMute)
            }
            Text(value)
                .font(Typeface.sans(15, weight: .semibold))
                .foregroundStyle(Palette.ink)
                .frame(width: 58, alignment: .trailing)
        }
        .padding(.vertical, 3)
    }

    private func read() {
        let points = camera.landmarks
        guard points.count >= 400 else { error = "No face is in view."; return }
        do {
            let measured = try Engines.shared.evaluate("face.features", ["landmarks": points], as: FaceFeatures.self)
            features = measured
            Router.shared.face = measured
            error = nil
            captured = true
        } catch {
            self.error = error.localizedDescription
        }
    }
}

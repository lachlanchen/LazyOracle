import AVFoundation
import SwiftUI
import MediaPipeTasksVision

/// The camera, and MediaPipe's landmarkers, behind one small object.
///
/// The web app runs the same two models through MediaPipe's WebAssembly build.
/// Here they run natively, which is what makes the overlay track the hand while
/// it moves instead of measuring one still photograph. The landmark numbering
/// is identical — 21 points for a hand, 478 for a face — so the palm and face
/// engines receive exactly what they already expect.
@Observable
final class LandmarkSession: NSObject {
    enum Kind {
        case hand, face

        var modelName: String { self == .hand ? "hand_landmarker" : "face_landmarker" }
    }

    /// Landmarks as the engines want them: x, y and z dictionaries.
    private(set) var landmarks: [[String: Double]] = []
    /// The same points, normalised, for drawing the overlay.
    private(set) var overlay: [CGPoint] = []
    private(set) var detecting = false
    var message: String?

    let kind: Kind
    let session = AVCaptureSession()

    private let queue = DispatchQueue(label: "art.lazying.auspice.camera")
    private var handLandmarker: HandLandmarker?
    private var faceLandmarker: FaceLandmarker?
    private var lastTimestamp = 0

    init(kind: Kind) {
        self.kind = kind
        super.init()
    }

    func start() {
        queue.async { [weak self] in
            guard let self else { return }
            if !self.session.isRunning {
                self.configure()
            }
            if !self.session.isRunning { self.session.startRunning() }
        }
    }

    func stop() {
        queue.async { [weak self] in
            guard let self, self.session.isRunning else { return }
            self.session.stopRunning()
        }
    }

    private func configure() {
        do {
            try makeLandmarker()
        } catch {
            Task { @MainActor in self.message = "The landmark model would not load: \(error.localizedDescription)" }
            return
        }

        session.beginConfiguration()
        session.sessionPreset = .high
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input) else {
            session.commitConfiguration()
            Task { @MainActor in self.message = "No camera is available on this device." }
            return
        }
        session.addInput(input)

        let output = AVCaptureVideoDataOutput()
        output.alwaysDiscardsLateVideoFrames = true
        output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
        output.setSampleBufferDelegate(self, queue: queue)
        if session.canAddOutput(output) { session.addOutput(output) }
        if let connection = output.connection(with: .video) {
            if connection.isVideoMirroringSupported { connection.isVideoMirrored = true }
            if #available(iOS 17.0, *) {
                connection.videoRotationAngle = 90
            }
        }
        session.commitConfiguration()
    }

    private func makeLandmarker() throws {
        guard let path = Bundle.main.path(forResource: kind.modelName, ofType: "task") else {
            throw NSError(domain: "Auspice", code: 1, userInfo: [NSLocalizedDescriptionKey: "model missing from the app"])
        }
        switch kind {
        case .hand:
            let options = HandLandmarkerOptions()
            options.baseOptions.modelAssetPath = path
            options.runningMode = .liveStream
            options.numHands = 1
            options.minHandDetectionConfidence = 0.5
            options.handLandmarkerLiveStreamDelegate = self
            handLandmarker = try HandLandmarker(options: options)
        case .face:
            let options = FaceLandmarkerOptions()
            options.baseOptions.modelAssetPath = path
            options.runningMode = .liveStream
            options.numFaces = 1
            options.faceLandmarkerLiveStreamDelegate = self
            faceLandmarker = try FaceLandmarker(options: options)
        }
    }

    private func publish(_ points: [NormalizedLandmark]) {
        let engineInput = points.map { point in
            ["x": Double(point.x), "y": Double(point.y), "z": Double(point.z)]
        }
        let drawn = points.map { CGPoint(x: Double($0.x), y: Double($0.y)) }
        Task { @MainActor in
            self.landmarks = engineInput
            self.overlay = drawn
            self.detecting = !points.isEmpty
        }
    }

    private func clear() {
        Task { @MainActor in
            self.overlay = []
            self.detecting = false
        }
    }
}

extension LandmarkSession: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(
        _ output: AVCaptureOutput,
        didOutput sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        guard let image = try? MPImage(sampleBuffer: sampleBuffer) else { return }
        // MediaPipe's live-stream mode insists on timestamps that only ever
        // increase; a repeated millisecond throws rather than being ignored.
        let stamp = Int(CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sampleBuffer)) * 1000)
        let timestamp = max(stamp, lastTimestamp + 1)
        lastTimestamp = timestamp
        switch kind {
        case .hand: try? handLandmarker?.detectAsync(image: image, timestampInMilliseconds: timestamp)
        case .face: try? faceLandmarker?.detectAsync(image: image, timestampInMilliseconds: timestamp)
        }
    }
}

extension LandmarkSession: HandLandmarkerLiveStreamDelegate {
    func handLandmarker(
        _ handLandmarker: HandLandmarker,
        didFinishDetection result: HandLandmarkerResult?,
        timestampInMilliseconds: Int,
        error: Error?
    ) {
        guard let hand = result?.landmarks.first, hand.count >= 21 else { clear(); return }
        publish(hand)
    }
}

extension LandmarkSession: FaceLandmarkerLiveStreamDelegate {
    func faceLandmarker(
        _ faceLandmarker: FaceLandmarker,
        didFinishDetection result: FaceLandmarkerResult?,
        timestampInMilliseconds: Int,
        error: Error?
    ) {
        guard let face = result?.faceLandmarks.first, face.count >= 400 else { clear(); return }
        publish(face)
    }
}

/// The live preview, with the landmarks drawn over it.
struct CameraView: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.layer.session = session
        view.layer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {}

    final class PreviewView: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        override var layer: AVCaptureVideoPreviewLayer { super.layer as! AVCaptureVideoPreviewLayer }
    }
}

/// The points themselves: small for a face mesh, larger and joined for a hand.
struct LandmarkOverlay: View {
    let points: [CGPoint]
    let joined: Bool

    private static let handBones: [(Int, Int)] = [
        (0, 1), (1, 2), (2, 3), (3, 4),
        (0, 5), (5, 6), (6, 7), (7, 8),
        (5, 9), (9, 10), (10, 11), (11, 12),
        (9, 13), (13, 14), (14, 15), (15, 16),
        (13, 17), (17, 18), (18, 19), (19, 20), (0, 17)
    ]

    var body: some View {
        Canvas { context, size in
            guard !points.isEmpty else { return }
            let scaled = points.map { CGPoint(x: $0.x * size.width, y: $0.y * size.height) }
            if joined, scaled.count >= 21 {
                var path = Path()
                for bone in Self.handBones {
                    path.move(to: scaled[bone.0])
                    path.addLine(to: scaled[bone.1])
                }
                context.stroke(path, with: .color(Palette.gold.opacity(0.75)), lineWidth: 2)
            }
            let radius: CGFloat = joined ? 3.5 : 1.1
            for point in scaled {
                context.fill(
                    Path(ellipseIn: CGRect(x: point.x - radius, y: point.y - radius, width: radius * 2, height: radius * 2)),
                    with: .color(joined ? Palette.gold : Palette.gold.opacity(0.65))
                )
            }
        }
        .allowsHitTesting(false)
    }
}

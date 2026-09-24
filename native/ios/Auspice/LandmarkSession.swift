import AVFoundation
import SwiftUI
import MediaPipeTasksVision

/// UI state never owns a running MediaPipe graph. The worker serializes model
/// creation, inference and teardown on one background queue.
@MainActor @Observable
final class LandmarkSession {
    enum Kind { case hand, face
        var modelName: String { self == .hand ? "hand_landmarker" : "face_landmarker" }
    }
    private(set) var landmarks: [[String: Double]] = []
    private(set) var overlay: [CGPoint] = []
    private(set) var detecting = false
    private(set) var captureWindow = CaptureWindow()
    private(set) var imageAspect: CGFloat = 0.75
    var ready: Bool { captureWindow.ready }
    func captureFrames() -> [[String: Any]] { captureWindow.snapshot() }
    private(set) var messageKey: String?
    var message: String? { messageKey.map(t) }
    private(set) var position: AVCaptureDevice.Position = .front
    private(set) var canFlip = false
    private var generation = 0
    private var wanted = false
    private let worker: LandmarkWorker
    var session: AVCaptureSession { worker.session }

    init(kind: Kind) { worker = LandmarkWorker(kind: kind) }
    deinit { worker.stop() }

    func start() {
        guard !wanted else { return }
        wanted = true
        generation += 1
        let token = generation
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: begin(token)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] allowed in
                Task { @MainActor in
                    guard let self, self.wanted, self.generation == token else { return }
                    if allowed { self.begin(token) }
                    else { self.messageKey = "camera.denied" }
                }
            }
        default: messageKey = "camera.denied"
        }
    }

    private func begin(_ token: Int) {
        messageKey = nil
        worker.start { [weak self] update in
            Task { @MainActor in
                guard let self, self.wanted, self.generation == token else { return }
                self.captureWindow.append(LandmarkFrame(landmarks: update.points, width: update.width, height: update.height, timestamp: update.timestamp))
                if update.height > 0 { self.imageAspect = CGFloat(update.width) / CGFloat(update.height) }
                self.landmarks = update.points
                self.overlay = update.points.map { CGPoint(x: $0["x"]!, y: $0["y"]!) }
                self.detecting = !update.points.isEmpty
                self.position = update.position
                self.canFlip = update.canFlip
                self.messageKey = update.messageKey
            }
        }
    }

    func stop() {
        wanted = false
        generation += 1 // Ignore a frame/permission reply queued before leaving.
        detecting = false
        captureWindow.clear()
        landmarks = []
        overlay = []
        worker.stop()
    }

    func flip() { captureWindow.clear(); detecting = false; landmarks = []; overlay = []; worker.flip() }
}

/// Video mode returns each result before the next frame/stop can execute.
/// Live-stream mode allowed graph callbacks to race deallocation (build 8).
/// Holding the worker strongly until stop finishes also keeps its destructor
/// and MediaPipe's logging shutdown off SwiftUI's main thread.
final class LandmarkWorker: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    struct Update {
        var points: [[String: Double]] = []
        var width = 0
        var height = 0
        var timestamp = 0
        var position: AVCaptureDevice.Position
        var canFlip: Bool
        var messageKey: String?
    }
    let session = AVCaptureSession()
    private let kind: LandmarkSession.Kind
    private let queue = DispatchQueue(label: "art.lazying.auspice.camera", qos: .userInitiated)
    private var handLandmarker: HandLandmarker?
    private var faceLandmarker: FaceLandmarker?
    private var output: AVCaptureVideoDataOutput?
    private var position: AVCaptureDevice.Position = .front
    private var canFlip = false
    private var running = false
    private var lastTimestamp = -1
    private var deliver: ((Update) -> Void)?

    init(kind: LandmarkSession.Kind) { self.kind = kind; super.init() }

    func start(deliver: @escaping (Update) -> Void) {
        queue.async { [self] in
            self.deliver = deliver
            guard !running else { return }
            do {
                try makeLandmarker()
                try configure()
                running = true
                lastTimestamp = -1
                session.startRunning()
                publish([])
            } catch {
                teardown()
                deliver(Update(position: position, canFlip: false, messageKey: "camera.unavailable"))
            }
        }
    }

    func stop() {
        queue.async { [self] in teardown(); deliver = nil }
    }

    private func teardown() {
        dispatchPrecondition(condition: .onQueue(queue))
        running = false
        output?.setSampleBufferDelegate(nil, queue: nil)
        if session.isRunning { session.stopRunning() }
        session.beginConfiguration()
        session.inputs.forEach { session.removeInput($0) }
        session.outputs.forEach { session.removeOutput($0) }
        session.commitConfiguration()
        output = nil
        // No inference or callback can still be running on this serial queue.
        handLandmarker = nil
        faceLandmarker = nil
    }

    private func camera(_ position: AVCaptureDevice.Position) -> AVCaptureDevice? {
        AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: position)
    }

    private func configure() throws {
        canFlip = camera(.front) != nil && camera(.back) != nil
        guard let device = camera(position) ?? camera(.back) ?? camera(.front) else { throw CameraFailure.unavailable }
        let input = try AVCaptureDeviceInput(device: device)
        let output = AVCaptureVideoDataOutput()
        output.alwaysDiscardsLateVideoFrames = true
        output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
        session.beginConfiguration()
        defer { session.commitConfiguration() }
        // Landmarkers resize input themselves; HD frames only waste memory on
        // smaller phones. Capture/detection is bounded to ten updates a second.
        if session.canSetSessionPreset(.vga640x480) { session.sessionPreset = .vga640x480 }
        guard session.canAddInput(input) else { throw CameraFailure.unavailable }
        session.addInput(input)
        guard session.canAddOutput(output) else { throw CameraFailure.unavailable }
        session.addOutput(output)
        self.output = output
        position = device.position
        applyGeometry(output)
        output.setSampleBufferDelegate(self, queue: queue)
    }

    private func applyGeometry(_ output: AVCaptureOutput) {
        guard let connection = output.connection(with: .video) else { return }
        if connection.isVideoMirroringSupported {
            connection.automaticallyAdjustsVideoMirroring = false
            connection.isVideoMirrored = position == .front
        }
        if connection.isVideoRotationAngleSupported(90) { connection.videoRotationAngle = 90 }
    }

    func flip() {
        queue.async { [self] in
            guard running, canFlip else { return }
            let wanted: AVCaptureDevice.Position = position == .front ? .back : .front
            guard let device = camera(wanted), let input = try? AVCaptureDeviceInput(device: device) else { return }
            let previous = session.inputs
            session.beginConfiguration()
            previous.forEach { session.removeInput($0) }
            if session.canAddInput(input) { session.addInput(input); position = wanted }
            else { previous.filter { session.canAddInput($0) }.forEach { session.addInput($0) } }
            session.outputs.forEach(applyGeometry)
            session.commitConfiguration()
            publish([])
        }
    }

    private func makeLandmarker() throws {
        guard let path = Bundle.main.path(forResource: kind.modelName, ofType: "task") else { throw CameraFailure.unavailable }
        switch kind {
        case .hand:
            let options = HandLandmarkerOptions()
            options.baseOptions.modelAssetPath = path
            options.runningMode = .video
            options.numHands = 1
            options.minHandDetectionConfidence = 0.7
            options.minHandPresenceConfidence = 0.7
            options.minTrackingConfidence = 0.7
            handLandmarker = try HandLandmarker(options: options)
        case .face:
            let options = FaceLandmarkerOptions()
            options.baseOptions.modelAssetPath = path
            options.runningMode = .video
            options.numFaces = 1
            options.minFaceDetectionConfidence = 0.7
            options.minFacePresenceConfidence = 0.7
            options.minTrackingConfidence = 0.7
            faceLandmarker = try FaceLandmarker(options: options)
        }
    }

    private func publish(_ points: [NormalizedLandmark], width: Int = 0, height: Int = 0, timestamp: Int = 0, messageKey: String? = nil) {
        let finite = points.allSatisfy { $0.x.isFinite && $0.y.isFinite && $0.z.isFinite }
        deliver?(Update(points: finite ? points.map { ["x": Double($0.x), "y": Double($0.y), "z": Double($0.z)] } : [],
                        width: width, height: height, timestamp: timestamp, position: position, canFlip: canFlip, messageKey: messageKey))
    }

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        processFrame(sampleBuffer)
    }

    private func processFrame(_ sampleBuffer: CMSampleBuffer) {
        guard running else { return }
        let seconds = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sampleBuffer))
        guard seconds.isFinite else { return }
        let stamp = Int(seconds * 1000)
        guard lastTimestamp < 0 || stamp - lastTimestamp >= 100 else { return }
        lastTimestamp = stamp
        autoreleasepool {
            do {
                let image = try MPImage(sampleBuffer: sampleBuffer)
                guard let pixels = CMSampleBufferGetImageBuffer(sampleBuffer) else { publish([]); return }
                let width = CVPixelBufferGetWidth(pixels), height = CVPixelBufferGetHeight(pixels)
                switch kind {
                case .hand:
                    let result = try handLandmarker?.detect(videoFrame: image, timestampInMilliseconds: stamp)
                    publish(result?.landmarks.first ?? [], width: width, height: height, timestamp: stamp)
                case .face:
                    let result = try faceLandmarker?.detect(videoFrame: image, timestampInMilliseconds: stamp)
                    publish(result?.faceLandmarks.first ?? [], width: width, height: height, timestamp: stamp)
                }
            } catch { publish([], messageKey: "camera.retry") }
        }
    }
    private enum CameraFailure: Error { case unavailable }
}

/// The live preview, with the landmarks drawn over it.
struct CameraView: UIViewRepresentable {
    let session: AVCaptureSession
    var mirrored = true

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.layer.session = session
        view.layer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {
        guard let connection = uiView.layer.connection else { return }
        if connection.isVideoRotationAngleSupported(90) { connection.videoRotationAngle = 90 }
        if connection.isVideoMirroringSupported {
            connection.automaticallyAdjustsVideoMirroring = false
            connection.isVideoMirrored = mirrored
        }
    }

    final class PreviewView: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        override var layer: AVCaptureVideoPreviewLayer { super.layer as! AVCaptureVideoPreviewLayer }
    }
}

/// The points themselves: small for a face mesh, larger and joined for a hand.
struct LandmarkOverlay: View {
    let points: [CGPoint]
    let joined: Bool
    var imageAspect: CGFloat = 0.75

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
            let height = max(size.height, size.width / imageAspect), width = height * imageAspect
            let scaled = points.map { CGPoint(x: $0.x * width - (width-size.width)/2, y: $0.y * height - (height-size.height)/2) }
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

/// The flip control, sitting over the preview. Only shown when the device
/// actually has both cameras.
struct CameraFlipButton: View {
    let session: LandmarkSession

    var body: some View {
        if session.canFlip {
            Button { session.flip() } label: {
                Label(
                    session.position == .front ? t("camera.front") : t("camera.back"),
                    systemImage: "arrow.triangle.2.circlepath.camera"
                )
                .font(Typeface.sans(13, weight: .semibold))
                .foregroundStyle(Palette.ink)
                .padding(.horizontal, 12)
                .frame(minHeight: 40)
                .background(Capsule().fill(.black.opacity(0.45)))
                .overlay(Capsule().strokeBorder(Palette.goldLine, lineWidth: 1))
            }
            .padding(10)
            .accessibilityLabel(l(session.position == .front ? "Switch to the back camera" : "Switch to the front camera"))
        }
    }
}

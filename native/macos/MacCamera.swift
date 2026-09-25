import AVFoundation
import CoreImage
import SwiftUI

/// Capture, JPEG conversion and lifecycle mutations stay on one queue. WebKit
/// runs inference in its own process; the queue drops frames while it is busy.
final class LandmarkWorker: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    struct Update {
        var points: [[String: Double]] = []
        var width = 0
        var height = 0
        var timestamp = 0
        var position: AVCaptureDevice.Position = .front
        var canFlip = false
        var messageKey: String?
    }
    let session = AVCaptureSession()
    private let queue = DispatchQueue(label: "art.lazying.lazyoracle.mac-camera", qos: .userInitiated)
    private let context = CIContext(options: [.cacheIntermediates: false])
    private let kind: LandmarkSession.Kind
    private var detector: MacVision?
    private var output: AVCaptureVideoDataOutput?
    private var deliver: ((Update) -> Void)?
    private var running = false
    private var busy = false
    private var generation = 0
    private var lastTimestamp = -1
    private var deviceIndex = 0
    private var devices: [AVCaptureDevice] = []

    init(kind: LandmarkSession.Kind) { self.kind = kind; super.init() }

    func start(deliver: @escaping (Update) -> Void) {
        queue.async { [self] in
            guard !running else { return }
            self.deliver = deliver
            generation += 1
            let token = generation
            running = true
            guard !availableCameras().isEmpty else { fail(key: "camera.unavailable"); return }
            Task { @MainActor in
                let vision = MacVision()
                do {
                    try await vision.start(kind: self.kind == .face ? "face" : "hand")
                    self.queue.async { [self] in
                        guard running, generation == token else {
                            Task { @MainActor in vision.close() }; return
                        }
                        detector = vision
                        do {
                            try configure()
                            lastTimestamp = -1
                            session.startRunning()
                            deliver(Update(canFlip: devices.count > 1))
                        } catch { fail() }
                    }
                } catch {
                    vision.close()
                    self.queue.async { [self] in if running, generation == token { fail() } }
                }
            }
        }
    }

    func stop() { queue.async { [self] in teardown(); deliver = nil } }

    private func teardown() {
        generation += 1
        running = false; busy = false
        output?.setSampleBufferDelegate(nil, queue: nil)
        if session.isRunning { session.stopRunning() }
        session.beginConfiguration()
        session.inputs.forEach { session.removeInput($0) }
        session.outputs.forEach { session.removeOutput($0) }
        session.commitConfiguration()
        output = nil
        if let detector { Task { @MainActor in detector.close() } }
        detector = nil
    }

    private func fail(key: String = "camera.retry") {
        teardown()
        deliver?(Update(messageKey: key))
    }

    private func availableCameras() -> [AVCaptureDevice] {
        AVCaptureDevice.DiscoverySession(deviceTypes: [.builtInWideAngleCamera, .external, .continuityCamera],
                                        mediaType: .video, position: .unspecified).devices
    }

    private func configure() throws {
        devices = availableCameras()
        guard !devices.isEmpty else { throw MacVision.Failure.unavailable }
        deviceIndex = min(deviceIndex, devices.count - 1)
        let input = try AVCaptureDeviceInput(device: devices[deviceIndex])
        let output = AVCaptureVideoDataOutput()
        output.alwaysDiscardsLateVideoFrames = true
        output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
        session.beginConfiguration()
        defer { session.commitConfiguration() }
        if session.canSetSessionPreset(.vga640x480) { session.sessionPreset = .vga640x480 }
        guard session.canAddInput(input) else { throw MacVision.Failure.unavailable }
        session.addInput(input)
        guard session.canAddOutput(output) else { throw MacVision.Failure.unavailable }
        session.addOutput(output)
        self.output = output
        mirror(output)
        output.setSampleBufferDelegate(self, queue: queue)
    }

    private func mirror(_ output: AVCaptureOutput) {
        if let connection = output.connection(with: .video), connection.isVideoMirroringSupported {
            connection.automaticallyAdjustsVideoMirroring = false
            connection.isVideoMirrored = true
        }
    }

    func flip() {
        queue.async { [self] in
            guard running, devices.count > 1 else { return }
            let next = (deviceIndex + 1) % devices.count
            guard let input = try? AVCaptureDeviceInput(device: devices[next]) else { return }
            generation += 1 // Old-camera inference must not enter the new burst.
            let previous = session.inputs
            session.beginConfiguration()
            previous.forEach { session.removeInput($0) }
            if session.canAddInput(input) { session.addInput(input); deviceIndex = next }
            else { previous.filter { session.canAddInput($0) }.forEach { session.addInput($0) } }
            if let output { mirror(output) }
            session.commitConfiguration()
            deliver?(Update(canFlip: true))
        }
    }

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        let seconds = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sampleBuffer))
        guard running, !busy, let detector, seconds.isFinite,
              let pixels = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        let stamp = Int(seconds * 1000)
        guard lastTimestamp < 0 || stamp - lastTimestamp >= 100 else { return }
        lastTimestamp = stamp
        guard let jpeg = context.jpegRepresentation(of: CIImage(cvPixelBuffer: pixels), colorSpace: CGColorSpaceCreateDeviceRGB(),
                                                   options: [kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: 0.9]) else { return }
        let width = CVPixelBufferGetWidth(pixels), height = CVPixelBufferGetHeight(pixels)
        let token = generation
        busy = true
        Task { @MainActor in
            let result: Result<[[String: Double]], Error>
            do { result = .success(try await detector.detect(jpeg: jpeg, timestamp: stamp)) }
            catch { result = .failure(error) }
            self.queue.async { [self] in
                guard running, self.detector === detector else { return }
                busy = false
                guard generation == token else { return }
                switch result {
                case .success(let points):
                    deliver?(Update(points: points, width: width, height: height, timestamp: stamp, canFlip: devices.count > 1))
                case .failure:
                    // A dead or stuck compute process is torn down, never retried forever.
                    fail()
                }
            }
        }
    }
}

struct CameraView: NSViewRepresentable {
    let session: AVCaptureSession
    var mirrored = true

    func makeNSView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.preview.session = session
        return view
    }
    func updateNSView(_ view: PreviewView, context: Context) {
        if let connection = view.preview.connection, connection.isVideoMirroringSupported {
            connection.automaticallyAdjustsVideoMirroring = false
            connection.isVideoMirrored = mirrored
        }
    }
    final class PreviewView: NSView {
        let preview = AVCaptureVideoPreviewLayer()
        override init(frame: NSRect) {
            super.init(frame: frame)
            wantsLayer = true
            preview.videoGravity = .resizeAspectFill
            layer?.addSublayer(preview)
        }
        required init?(coder: NSCoder) { nil }
        override func layout() { super.layout(); preview.frame = bounds }
    }
}

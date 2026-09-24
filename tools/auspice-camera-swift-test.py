#!/usr/bin/env python3
"""Generate an iOS Simulator stress harness from the actual MediaPipe worker.

Only model lookup and camera capture are replaced with on-disk models and
recorded frames. Production inference, throttling, clear and teardown run.
"""
from pathlib import Path
import sys
source=Path('native/ios/Auspice/LandmarkSession.swift').read_text()
source=source[source.index('final class LandmarkWorker:'):source.index('/// The live preview')]
source=source.replace('Bundle.main.path(forResource: kind.modelName, ofType: "task")','Optional(CommandLine.arguments[1] + "/" + kind.modelName + ".task")')
engines=Path('native/ios/Auspice/Engines.swift').read_text().replace('Bundle.main.url(forResource: "lazyoracle-engines", withExtension: "js")', 'Optional(URL(fileURLWithPath: CommandLine.arguments[1] + "/lazyoracle-engines.js"))')
models=Path('native/ios/Auspice/Models.swift').read_text()
source=engines+models+'''import AVFoundation
import UIKit
import MediaPipeTasksVision
enum LandmarkSession { enum Kind { case hand, face
    var modelName: String { self == .hand ? "hand_landmarker" : "face_landmarker" }
} }
'''+source+r'''
extension LandmarkWorker {
    func exercise(_ frame: CVPixelBuffer, cycle: Int) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            queue.async { [self] in
                do {
                    precondition(!Thread.isMainThread)
                    try makeLandmarker()
                    running = true
                    lastTimestamp = -1
                    var hits = 0
                    var points: [[String: Double]] = []
                    deliver = { update in if !update.points.isEmpty { hits += 1; points = update.points } }
                    for index in 0..<6 {
                        var format: CMVideoFormatDescription?
                        CMVideoFormatDescriptionCreateForImageBuffer(allocator: kCFAllocatorDefault, imageBuffer: frame, formatDescriptionOut: &format)
                        var timing = CMSampleTimingInfo(duration: .invalid, presentationTimeStamp: CMTime(value: Int64(index * 100 + 100), timescale: 1000), decodeTimeStamp: .invalid)
                        var sample: CMSampleBuffer?
                        CMSampleBufferCreateReadyWithImageBuffer(allocator: kCFAllocatorDefault, imageBuffer: frame, formatDescription: format!, sampleTiming: &timing, sampleBufferOut: &sample)
                        processFrame(sample!)
                    }
                    precondition(hits > 0, "Fixture must produce real landmarks")
                    // Feed the actual detected landmarks through the production
                    // bridge and Codable models used by the reading screens.
                    if kind == .face {
                        let result = try Engines.shared.evaluate("face.features", ["landmarks": points], as: FaceFeatures.self)
                        precondition(result.courts.count == 3 && result.palaces.count == 8)
                        _ = try JSONEncoder().encode(result)
                    } else {
                        let result = try Engines.shared.evaluate("palm.features", ["landmarks": points, "lines": LineTraits().dictionary], as: PalmFeatures.self)
                        precondition(result.fingers.count == 4 && result.lines.heart == "between")
                        _ = try JSONEncoder().encode(result)
                    }
                    // Teardown is enqueued after inference; never on main.
                    stop()
                    queue.async { [self] in
                        precondition(!running && handLandmarker == nil && faceLandmarker == nil)
                        precondition(session.inputs.isEmpty && session.outputs.isEmpty)
                        print("PASS cycle \(cycle): real \(kind) detection, native feature decoding/encoding and complete background teardown")
                        continuation.resume()
                    }
                } catch { teardown(); continuation.resume(throwing: error) }
            }
        }
    }
}
@main struct CameraStress {
    @MainActor static func main() async throws {
        var pulses = 0
        let heartbeat = Task { @MainActor in
            while !Task.isCancelled {
                pulses += 1
                try? await Task.sleep(nanoseconds: 20_000_000)
            }
        }
        for cycle in 0..<24 {
            let kind: LandmarkSession.Kind = cycle % 2 == 0 ? .face : .hand
            let image = UIImage(contentsOfFile: CommandLine.arguments[kind == .face ? 2 : 3])!
            let cg = image.cgImage!
            var buffer: CVPixelBuffer?
            CVPixelBufferCreate(kCFAllocatorDefault, cg.width, cg.height, kCVPixelFormatType_32BGRA, [kCVPixelBufferCGImageCompatibilityKey: true,kCVPixelBufferCGBitmapContextCompatibilityKey: true] as CFDictionary, &buffer)
            let frame = buffer!
            CVPixelBufferLockBaseAddress(frame, [])
            let context = CGContext(data: CVPixelBufferGetBaseAddress(frame), width: cg.width, height: cg.height, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(frame), space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
            context.draw(cg, in: CGRect(x: 0, y: 0, width: cg.width, height: cg.height))
            CVPixelBufferUnlockBaseAddress(frame, [])
            let worker = LandmarkWorker(kind: kind)
            try await worker.exercise(frame, cycle: cycle)
        }
        heartbeat.cancel()
        precondition(pulses > 5, "Main actor must remain responsive during inference and teardown")
        print("PASS 24 create/detect/stop cycles, 144 frames; main actor heartbeat \(pulses)")
    }
}
'''
Path(sys.argv[1]).write_text(source)

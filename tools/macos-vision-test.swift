import AppKit
import ImageIO

// Compile alongside production MacVision.swift. Takes bundled Vision directory,
// a face fixture and an open-hand fixture; never uses a person's live camera.
@main struct VisionTest {
    @MainActor static func main() {
        setbuf(stdout, nil)
        NSApplication.shared.setActivationPolicy(.prohibited)
        // A headless test has no visible window to prevent App Nap between
        // detector lifetimes. Keep the test itself active across all cycles.
        let activity = ProcessInfo.processInfo.beginActivity(options: .userInitiated, reason: "Validate offline landmark lifecycle")
        Task { @MainActor in
            defer { ProcessInfo.processInfo.endActivity(activity) }
            do {
                for cycle in 0..<3 {
                    for (kind, argument, count) in [("face", 2, 478), ("hand", 3, 21)] {
                        print("START \(kind) cycle=\(cycle)")
                        let engine = MacVision(resources: URL(fileURLWithPath: CommandLine.arguments[1]))
                        try await engine.start(kind: kind)
                        let jpeg = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[argument]))
                        let source = CGImageSourceCreateWithData(jpeg as CFData, nil)!
                        let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil)! as NSDictionary
                        let width = properties[kCGImagePropertyPixelWidth] as! Int
                        let height = properties[kCGImagePropertyPixelHeight] as! Int
                        var frames: [[String: Any]] = []
                        var baseline: [[String: Double]]?
                        for index in 0..<12 {
                            let start = Date()
                            let points = try await engine.detect(jpeg: jpeg, timestamp: 100 + index * 100)
                            precondition(points.count == count, "Expected real \(kind) landmarks, got \(points.count)")
                            frames.append(["landmarks": points, "width": width, "height": height, "timestamp": 100 + index * 100])
                            if let baseline {
                                let drift = zip(baseline, points).map { abs($0["x"]! - $1["x"]!) + abs($0["y"]! - $1["y"]!) }.max()!
                                precondition(drift < 0.025, "Unstable fixed-image landmarks: \(drift)")
                            } else { baseline = points }
                            print("PASS \(kind) cycle=\(cycle) frame=\(index) count=\(points.count) seconds=\(Date().timeIntervalSince(start))")
                        }
                        if kind == "face" {
                            let features = try Engines.shared.evaluate("face.capture", ["frames": frames], as: FaceFeatures.self)
                            precondition(features.classification?.primary == features.element && features.measurement?.samples == 8)
                            _ = try JSONDecoder().decode(FaceFeatures.self, from: JSONEncoder().encode(features))
                            print("PASS face engine and persistence: \(features.element)")
                        } else {
                            let features = try Engines.shared.evaluate("palm.capture", ["frames": frames, "lines": LineTraits().dictionary], as: PalmFeatures.self)
                            precondition(features.fingers.count == 4 && features.measurement?.samples == 8 && features.palaces.isEmpty)
                            _ = try JSONDecoder().decode(PalmFeatures.self, from: JSONEncoder().encode(features))
                            print("PASS palm engine and persistence: \(features.shape)")
                        }
                        print("CLOSE \(kind) cycle=\(cycle)")
                        engine.close()
                        print("CLOSED \(kind) cycle=\(cycle)")
                    }
                }
                print("PASS 72 offline detections with production Mac adapter and six complete teardowns")
                exit(0)
            } catch {
                fputs("FAIL \(error)\n", stderr)
                exit(1)
            }
        }
        NSApplication.shared.run()
    }
}

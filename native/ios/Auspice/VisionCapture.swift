import Foundation

/// Transient landmarks only: no pictures, matching identifiers or previous
/// person's measurements. Geometry/stability rules live in the shared engine.
struct LandmarkFrame {
    var landmarks: [[String: Double]]
    var width: Int
    var height: Int
    var timestamp: Int
    var dictionary: [String: Any] {
        ["landmarks": landmarks, "width": width, "height": height, "timestamp": timestamp]
    }
}

struct CaptureWindow {
    private(set) var frames: [LandmarkFrame] = []
    private var receivedAt = 0.0
    var ready: Bool { frames.count >= 8 && (frames.last!.timestamp - frames.first!.timestamp) >= 650 }
    mutating func clear() { frames = []; receivedAt = 0 }
    mutating func append(_ frame: LandmarkFrame, now: Double = ProcessInfo.processInfo.systemUptime) {
        guard !frame.landmarks.isEmpty, frame.width > 0, frame.height > 0 else { clear(); return }
        if let last = frames.last, frame.timestamp <= last.timestamp || frame.timestamp - last.timestamp > 300 ||
            frame.width != last.width || frame.height != last.height { clear() }
        frames.append(frame)
        frames = Array(frames.filter { frame.timestamp - $0.timestamp <= 1800 }.suffix(12))
        receivedAt = now
    }
    func snapshot(now: Double = ProcessInfo.processInfo.systemUptime) -> [[String: Any]] {
        guard ready, now - receivedAt <= 0.5 else { return [] }
        return frames.map(\.dictionary)
    }
}

struct VisionMeasurement: Codable {
    var version: Int
    var samples: Int
    var typeCandidates: [String]
    var limitations: [String]
}

func visionError(_ error: Error) -> String {
    let key = error.localizedDescription
    return key.hasPrefix("vision.") ? t(key) : l("This reading could not be computed. Please try again.")
}

func visionState(_ value: String) -> String { value == "uncertain" ? t("vision.uncertain") : l(value) }

import Foundation
#if canImport(llama)
import llama
#endif

/// A reader that runs on the phone even when Apple's own model cannot.
///
/// Apple's system model needs recent hardware. On everything older — an
/// iPhone SE, an iPad from a few years back — this downloads a small open
/// model once and runs it with llama.cpp on the phone's own GPU. It is not as
/// fluent as the cloud reader, but it is free, private, and works with the
/// aeroplane mode on, which is the point.
///
/// The engines are still the source of every fact. A model this size cannot be
/// trusted to orchestrate tools through a JSON protocol, so it is given the
/// computed facts up front and asked only to read them — which is the job it
/// is actually good at.
enum DownloadedModel {
    struct Choice: Identifiable, Hashable {
        let id: String
        let name: String
        let sizeMB: Int
        let url: URL
        let contextTokens: Int
    }

    /// Two sizes. The small one runs on anything with 3 GB of memory; the
    /// larger one reads noticeably better and wants 4 GB.
    static let choices: [Choice] = [
        Choice(
            id: "gemma-1b",
            name: "Auspice Small",
            sizeMB: 769,
            url: URL(string: "https://huggingface.co/unsloth/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf")!,
            contextTokens: 4096
        ),
        Choice(
            id: "qwen-1.7b",
            name: "Auspice Standard",
            sizeMB: 1081,
            url: URL(string: "https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-UD-Q4_K_XL.gguf")!,
            contextTokens: 4096
        ),
    ]

    static var directory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Auspice/models", isDirectory: true)
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        return base
    }

    static func file(for choice: Choice) -> URL {
        directory.appendingPathComponent("\(choice.id).gguf")
    }

    static func isDownloaded(_ choice: Choice) -> Bool {
        guard let size = try? FileManager.default.attributesOfItem(atPath: file(for: choice).path)[.size] as? Int64 else {
            return false
        }
        // A part-finished download is not a model; require most of the bytes.
        return size > Int64(choice.sizeMB) * 900_000
    }

    static var downloaded: Choice? {
        choices.first(where: isDownloaded)
    }

    /// Enough free space to hold the file and still run it.
    static func hasRoom(for choice: Choice) -> Bool {
        guard let values = try? directory.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey]),
              let free = values.volumeAvailableCapacityForImportantUsage else { return true }
        return free > Int64(Double(choice.sizeMB) * 2.2 * 1_000_000)
    }

    static func remove(_ choice: Choice) {
        try? FileManager.default.removeItem(at: file(for: choice))
        Runtime.shared.unload()
    }
}

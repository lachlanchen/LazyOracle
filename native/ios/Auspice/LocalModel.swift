import Foundation
#if canImport(FoundationModels)
import FoundationModels
#endif

/// The reader that runs on the phone itself.
///
/// Apple ships a language model with the system on recent devices. It costs
/// nothing, downloads nothing, and never leaves the phone — which makes a
/// genuinely local Auspice possible without asking anyone to fetch a gigabyte
/// of weights. It also has tool calling of its own, so the same nine engines
/// are offered to it the same way they are offered to the cloud reader, and it
/// still never invents a card or a pillar.
///
/// Where it is not available — an older phone, or Apple Intelligence switched
/// off — the app falls back to the relay, and says which one answered.
enum LocalModel {
    enum Readiness: Equatable {
        case ready
        case needsAppleIntelligence
        case deviceTooOld
        case notYetDownloaded
        case unsupportedOS

        var explanation: String {
            switch self {
            case .ready: t("local.ready")
            case .needsAppleIntelligence: t("local.needsIntelligence")
            case .deviceTooOld: t("local.deviceTooOld")
            case .notYetDownloaded: t("local.notReady")
            case .unsupportedOS: t("local.unsupportedOS")
            }
        }
    }

    static var readiness: Readiness {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            switch SystemLanguageModel.default.availability {
            case .available:
                return .ready
            case .unavailable(let reason):
                switch reason {
                case .appleIntelligenceNotEnabled: return .needsAppleIntelligence
                case .deviceNotEligible: return .deviceTooOld
                case .modelNotReady: return .notYetDownloaded
                @unknown default: return .notYetDownloaded
                }
            @unknown default:
                return .notYetDownloaded
            }
        }
        #endif
        return .unsupportedOS
    }

    static var isReady: Bool { readiness == .ready }
}

#if canImport(FoundationModels)
@available(iOS 26.0, *)
extension LocalModel {
    /// One engine, offered to the on-device model as a tool it may call.
    ///
    /// Apple's framework runs the loop itself: it decides to call, we compute,
    /// it reads the result. The arguments come back already typed, so there is
    /// no fragment of JSON to reassemble the way the streaming cloud protocol
    /// needs.
    struct EngineTool: Tool {
        let name: String
        let description: String

        @Generable
        struct Arguments {
            @Guide(description: "Optional JSON object of arguments for this tool, or an empty object.")
            var json: String?
        }

        func call(arguments: Arguments) async throws -> String {
            let parsed = (arguments.json?.data(using: .utf8))
                .flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] } ?? [:]
            let outcome = AgentTools.run(name, arguments: parsed)
            await MainActor.run { ChatStore.shared.noteTool(outcome) }
            return outcome.output
        }
    }

    static func tools() -> [any Tool] {
        AgentTools.descriptions.map { EngineTool(name: $0.name, description: $0.description) }
    }

    /// Answers a conversation on the device, streaming as it writes.
    ///
    /// The transcript is replayed as a single prompt rather than as turns,
    /// because a session started fresh each time cannot be handed the history
    /// any other way, and because the compaction the app already does means
    /// the transcript is always short enough to be worth repeating.
    static func answer(
        transcript: [Relay.Message],
        onDelta: @escaping (String) -> Void
    ) async throws -> String {
        let instructions = transcript.first(where: { $0.role == "system" })?.content ?? ChatStore.systemPrompt
        let spoken = transcript.filter { $0.role == "user" || $0.role == "assistant" }
        let prompt = spoken.map { turn in
            (turn.role == "user" ? "Reader: " : "You: ") + (turn.content ?? "")
        }.joined(separator: "\n\n")

        let session = LanguageModelSession(tools: tools(), instructions: instructions)
        var written = ""
        for try await partial in session.streamResponse(to: prompt) {
            // Apple streams cumulative snapshots; send only what is new.
            let text = partial.content
            if text.count > written.count {
                let piece = String(text.dropFirst(written.count))
                written = text
                onDelta(piece)
            }
        }
        return written
    }
}
#endif

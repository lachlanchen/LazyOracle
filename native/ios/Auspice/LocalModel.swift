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

    /// Instructions for the reader on the phone.
    ///
    /// A three-billion-parameter model follows short, concrete rules far
    /// better than long prose, so this is the cloud prompt boiled down: the
    /// same discipline, a quarter of the words. The method notes are dropped
    /// because the tool results already carry the method's own vocabulary, and
    /// spending the instruction budget on them costs more than it returns.
    static let instructions = """
    You are the reader in Auspice. Never invent a card, hexagram, pillar, chart     or almanac entry — call the tool, then read what it returns. If the tool     disagrees with you, the tool is right.

    Rules for your answer:
    1. Call a tool before answering any question about a day, a chart, a draw or     a cast. For a hand or a face, call read_palm or read_face.
    2. Reply in the language the reader wrote in, and stay in it.
    3. Keep the tradition's terms in Chinese characters: 宜, 忌, 日主, 卦.
    4. Two or three short paragraphs. No headings, no bullet lists, no bold labels.
    5. Open with the answer. Give the one fact it rests on, naming where it came     from. End with one thing the reader can do.
    6. If a tool could not compute something, say so. Never claim certainty about     health, death or the law.
    """
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

    /// One session per conversation, kept alive.
    ///
    /// Building a session is the slow part — the model has to be brought up and
    /// the instructions taken in. Holding one per conversation means the second
    /// question is answered immediately, and it also gives the model its own
    /// memory of the exchange, so the history does not have to be replayed as a
    /// wall of text on every turn.
    private static var sessions: [UUID: LanguageModelSession] = [:]

    static func session(for conversation: UUID) -> LanguageModelSession {
        if let existing = sessions[conversation] { return existing }
        let made = LanguageModelSession(tools: tools(), instructions: instructions)
        sessions[conversation] = made
        return made
    }

    static func forget(_ conversation: UUID) {
        sessions[conversation] = nil
    }

    /// Wakes the model up before the reader has finished typing, so the first
    /// word of the answer arrives without the model being loaded first.
    static func prewarm(_ conversation: UUID) {
        guard isReady else { return }
        session(for: conversation).prewarm()
    }

    /// Answers on the device, streaming as it writes.
    static func answer(
        conversation: UUID,
        question: String,
        onDelta: @escaping (String) -> Void
    ) async throws -> String {
        let session = session(for: conversation)
        let options = GenerationOptions(temperature: 0.7)
        var written = ""
        for try await partial in session.streamResponse(to: question, options: options) {
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

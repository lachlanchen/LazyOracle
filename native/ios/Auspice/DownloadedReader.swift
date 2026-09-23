import Foundation

/// How a small downloaded model is asked to read.
///
/// A one- or two-billion-parameter model cannot be trusted to orchestrate
/// tools through a JSON protocol — it will invent an argument, or call nothing
/// and answer from its own imagination, which is the one thing this app must
/// never do. So the work is split in two, and each half is something a small
/// model is actually good at:
///
///   1. Pick one tool from a numbered list. A dozen tokens, nothing to invent.
///   2. Read the computed facts back in words, with the facts already in hand.
///
/// The engines remain the only source of anything factual.
@Observable
final class DownloadedReader {
    static let shared = DownloadedReader()

    private(set) var progress: Double?
    private(set) var downloading: DownloadedModel.Choice?
    var error: String?

    private var task: URLSessionDownloadTask?
    private var observation: NSKeyValueObservation?

    private init() {}

    var isReady: Bool { DownloadedModel.downloaded != nil }

    // MARK: Fetching the model

    func download(_ choice: DownloadedModel.Choice) {
        guard downloading == nil else { return }
        guard DownloadedModel.hasRoom(for: choice) else {
            error = t("downloaded.noRoom")
            return
        }
        downloading = choice
        progress = 0
        error = nil

        let destination = DownloadedModel.file(for: choice)
        let task = URLSession.shared.downloadTask(with: choice.url) { [weak self] temporary, _, failure in
            guard let self else { return }
            defer {
                Task { @MainActor in
                    self.downloading = nil
                    self.progress = nil
                    self.observation = nil
                }
            }
            if let failure {
                Task { @MainActor in self.error = failure.localizedDescription }
                return
            }
            guard let temporary else { return }
            try? FileManager.default.removeItem(at: destination)
            try? FileManager.default.moveItem(at: temporary, to: destination)
            // A model on the phone is worth keeping through a backup cycle,
            // but it is re-downloadable, so it does not belong in iCloud.
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            var mutable = destination
            try? mutable.setResourceValues(values)
        }
        observation = task.progress.observe(\.fractionCompleted) { [weak self] progress, _ in
            Task { @MainActor in self?.progress = progress.fractionCompleted }
        }
        self.task = task
        task.resume()
    }

    func cancel() {
        task?.cancel()
        task = nil
        downloading = nil
        progress = nil
    }

    // MARK: Reading

    private static let narrationInstructions = """
    You are the reader in Auspice. You are given facts that have already been \
    computed on this device; read them, and never add a card, hexagram, pillar \
    or almanac entry that is not among them.

    Reply in the language the reader wrote in. Keep the tradition's terms in \
    Chinese characters: 宜, 忌, 日主, 卦. Write two or three short paragraphs — \
    no headings, no lists, no bold labels. Open with the answer, give the fact \
    it rests on, and end with one thing the reader can do.
    """

    /// Runs the two passes and streams the second.
    func answer(
        question: String,
        onStage: @escaping (String) -> Void,
        onDelta: @escaping (String) -> Void
    ) async throws -> AgentTools.Outcome? {
        guard let choice = DownloadedModel.downloaded else { throw Runtime.Failure.unavailable }
        try Runtime.shared.load(choice)

        onStage(t("downloaded.thinking"))
        let chosen = try await chooseTool(for: question)
        var outcome: AgentTools.Outcome?
        var facts = ""
        if let chosen {
            let result = AgentTools.run(chosen, arguments: arguments(for: chosen, question: question))
            outcome = result
            facts = "Computed facts (\(chosen)):\n\(String(result.output.prefix(6000)))"
        }

        let prompt = facts.isEmpty
            ? "The reader asks: \(question)"
            : "\(facts)\n\nThe reader asks: \(question)\n\nRead the facts above and answer."
        try await Runtime.shared.answer(
            system: Self.narrationInstructions,
            user: prompt,
            onToken: onDelta
        )
        return outcome
    }

    /// One short pass: which tool, if any.
    private func chooseTool(for question: String) async throws -> String? {
        let names = AgentTools.descriptions.map(\.name)
        let menu = AgentTools.descriptions.enumerated()
            .map { "\($0.offset + 1). \($0.element.name) — \($0.element.description.prefix(90))" }
            .joined(separator: "\n")
        let instructions = """
        Choose the one computation that answers the reader's question. Reply \
        with its name alone and nothing else. If none of them fits, reply none.
        """
        var picked = ""
        try await Runtime.shared.answer(
            system: instructions,
            user: "\(menu)\n\nQuestion: \(question)\n\nName:",
            maximumTokens: 12
        ) { piece in picked += piece }

        let cleaned = picked.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        return names.first { cleaned.contains($0) }
    }

    /// The small model is not asked for arguments; they are taken from the
    /// question where they are unambiguous and left at their defaults where
    /// they are not.
    private func arguments(for tool: String, question: String) -> [String: Any] {
        let asked = question.lowercased()
        switch tool {
        case "draw_tarot":
            if asked.contains("one card") || asked.contains("single") { return ["spread": "one", "question": question] }
            if asked.contains("celtic") || asked.contains("ten") { return ["spread": "celtic", "question": question] }
            return ["spread": "three", "question": question]
        case "cast_iching":
            return ["method": asked.contains("yarrow") ? "yarrow" : "coins", "question": question]
        case "open_book":
            return ["book": asked.contains("question") ? "questions" : "answers", "question": question]
        case "almanac_day":
            let activities = ["marry", "travel", "move", "business", "contract", "build",
                              "bed", "ritual", "medicine", "study", "meet", "grooming"]
            if let match = activities.first(where: { asked.contains($0) }) { return ["activity": match] }
            return [:]
        default:
            return [:]
        }
    }
}

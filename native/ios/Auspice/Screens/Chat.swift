import SwiftUI

// MARK: - What a conversation is made of

struct Turn: Codable, Identifiable, Equatable {
    enum Kind: String, Codable {
        case reader, oracle, tool, note
    }
    var id = UUID()
    var kind: Kind
    var text: String
    var at = Date()
    /// Set on a tool turn: what was computed, in one short line.
    var ok = true
}

struct ChatSession: Codable, Identifiable, Equatable {
    var id = UUID()
    var title = "New conversation"
    var turns: [Turn] = []
    var summary: String?
    var updated = Date()

    /// The first thing the reader said, which makes a better title than a date.
    mutating func retitle() {
        if let first = turns.first(where: { $0.kind == .reader })?.text, !first.isEmpty {
            title = String(first.prefix(48))
        }
    }
}

/// Every conversation, kept on the device.
///
/// The last conversation is the one that opens, so context accumulates instead
/// of starting over each time; a new one is made only when asked for. Nothing
/// is capped: when the history outgrows what can be sent, the older part is
/// replaced by a summary the model writes itself, the way a long chat is
/// handled elsewhere.
@Observable
final class ChatStore {
    static let shared = ChatStore()

    var sessions: [ChatSession] = []
    var currentId: UUID?
    var streaming = false
    var error: String?
    var tier = "tianji-fast"

    /// Which reader answers. The on-device one is free, private and needs no
    /// download, so it is preferred wherever the phone can run it.
    enum Reader: String, CaseIterable {
        case automatic, onDevice, cloud
    }

    var reader: Reader = .automatic {
        didSet { UserDefaults.standard.set(reader.rawValue, forKey: "auspice.reader") }
    }

    /// The one actually used for the next answer.
    var effectiveReader: Reader {
        switch reader {
        case .automatic:
            // The relay. It is the only reader whose readings have been
            // measured against the engines and found faithful; a reader that
            // gets 宜 and 忌 the wrong way round is worse than no reader.
            return .cloud
        case .onDevice: return LocalModel.isReady ? .onDevice : .cloud
        case .cloud: return .cloud
        }
    }

    private let file: URL = {
        let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Auspice", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory.appendingPathComponent("conversations.json")
    }()

    /// Roughly how much history to send. Four characters to a token is close
    /// enough for English and generous for Chinese, which is what matters.
    private let budgetCharacters = 24_000

    private init() {
        if let stored = UserDefaults.standard.string(forKey: "auspice.reader"),
           let known = Reader(rawValue: stored) {
            reader = known
        }
        load()
        if sessions.isEmpty {
            sessions = [ChatSession()]
        }
        currentId = sessions.first?.id
    }

    var current: ChatSession {
        get { sessions.first { $0.id == currentId } ?? sessions[0] }
        set {
            if let index = sessions.firstIndex(where: { $0.id == newValue.id }) {
                sessions[index] = newValue
            }
        }
    }

    func newSession() {
        let session = ChatSession()
        sessions.insert(session, at: 0)
        currentId = session.id
        save()
    }

    func delete(_ id: UUID) {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) { LocalModel.forget(id) }
        #endif
        sessions.removeAll { $0.id == id }
        if sessions.isEmpty { sessions = [ChatSession()] }
        if currentId == id { currentId = sessions[0].id }
        save()
    }

    /// Shows a tool line in the log. Called by the on-device reader, which
    /// runs its own loop and tells us only that a tool fired.
    func noteTool(_ outcome: AgentTools.Outcome) {
        var session = current
        session.turns.append(Turn(kind: .tool, text: outcome.label, ok: outcome.ok))
        current = session
    }

    private func removeTurn(_ id: UUID) {
        var session = current
        session.turns.removeAll { $0.id == id }
        current = session
    }

    func clearCurrent() {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) { LocalModel.forget(current.id) }
        #endif
        var session = current
        session.turns = []
        session.summary = nil
        session.title = "New conversation"
        current = session
        save()
    }

    // MARK: Persistence

    private func load() {
        guard let data = try? Data(contentsOf: file),
              let decoded = try? JSONDecoder().decode([ChatSession].self, from: data) else { return }
        sessions = decoded.sorted { $0.updated > $1.updated }
    }

    func save() {
        var session = current
        session.updated = Date()
        session.retitle()
        current = session
        if let data = try? JSONEncoder().encode(sessions) {
            try? data.write(to: file, options: .atomic)
        }
    }

    // MARK: The conversation itself

    func send(_ text: String) {
        let asked = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !asked.isEmpty, !streaming else { return }
        var session = current
        session.turns.append(Turn(kind: .reader, text: asked))
        current = session
        save()
        Task { await run() }
    }

    @MainActor
    private func run() async {
        streaming = true
        error = nil
        defer { streaming = false }
        switch effectiveReader {
        case .onDevice: await runOnDevice()
        default: await runInCloud()
        }
    }

    @MainActor
    private func runInCloud() async {
        var attempted = Set<String>()
        var emptyReplies = 0
        for step in 0..<AgentTools.maxSteps {
            var wire = await messagesForModel()
            do {
                var holder = Turn(kind: .oracle, text: "")
                var opened = false
                let answer = try await Relay.stream(
                    messages: wire,
                    tools: AgentTools.schemas(),
                    tier: tier
                ) { [weak self] piece in
                    guard let self else { return }
                    Task { @MainActor in
                        var session = self.current
                        if !opened {
                            opened = true
                            session.turns.append(holder)
                        }
                        if let index = session.turns.lastIndex(where: { $0.id == holder.id }) {
                            session.turns[index].text += piece
                        }
                        self.current = session
                    }
                }
                holder.text = answer.text

                guard !answer.toolCalls.isEmpty else {
                    if answer.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        // The provider sometimes returns nothing at all after a
                        // tool result. Ask once more before giving up, or the
                        // reader is left with the model's "let me check…" line
                        // as the entire reading.
                        if opened { removeTurn(holder.id) }
                        if emptyReplies == 0 {
                            emptyReplies += 1
                            continue
                        }
                        var session = current
                        session.turns.append(Turn(
                            kind: .note,
                            text: t("chat.quiet"),
                            ok: false
                        ))
                        current = session
                        save()
                        return
                    }
                    if !opened {
                        var session = current
                        session.turns.append(Turn(kind: .oracle, text: answer.text))
                        current = session
                    }
                    save()
                    return
                }

                // The model asked for a computation. Run it, show one line for
                // it, and go round again with the facts in hand.
                for call in answer.toolCalls {
                    let name = call.function?.name ?? ""
                    let rawArguments = call.function?.arguments ?? "{}"
                    let signature = name + rawArguments
                    let arguments = (try? JSONSerialization.jsonObject(with: Data(rawArguments.utf8))) as? [String: Any] ?? [:]
                    let outcome: AgentTools.Outcome
                    if attempted.contains(signature) {
                        // The same call twice means the model is stuck; say so
                        // rather than looping until the step budget runs out.
                        outcome = AgentTools.Outcome(
                            label: "Already computed",
                            output: "{\"note\":\"You already called this with these arguments. Answer with what you have.\"}",
                            ok: false
                        )
                    } else {
                        attempted.insert(signature)
                        outcome = AgentTools.run(name, arguments: arguments)
                    }
                    var session = current
                    session.turns.append(Turn(kind: .tool, text: outcome.label, ok: outcome.ok))
                    current = session

                    wire.append(Relay.Message(role: "assistant", content: answer.text.isEmpty ? nil : answer.text, tool_calls: [call]))
                    wire.append(Relay.Message(role: "tool", content: outcome.output, tool_call_id: call.id ?? "call_0", name: name))
                }
                save()
                if step == AgentTools.maxSteps - 1 {
                    var session = current
                    session.turns.append(Turn(kind: .note, text: "The reading stopped after \(AgentTools.maxSteps) computations.", ok: false))
                    current = session
                    save()
                }
            } catch {
                self.error = error.localizedDescription
                var session = current
                session.turns.append(Turn(kind: .note, text: error.localizedDescription, ok: false))
                current = session
                save()
                return
            }
        }
    }

    /// The on-device reader runs its own tool loop, so all this has to do is
    /// hand it the conversation and append what it writes.
    /// The on-device reader runs its own tool loop, so all this has to do is
    /// hand it the conversation and append what it writes.
    @MainActor
    private func runOnDevice() async {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            let asked = current.turns.last(where: { $0.kind == .reader })?.text ?? ""
            let holder = Turn(kind: .oracle, text: "")
            var opened = false
            do {
                _ = try await LocalModel.answer(conversation: current.id, question: asked) { [weak self] piece in
                    guard let self else { return }
                    var session = self.current
                    if !opened {
                        opened = true
                        session.turns.append(holder)
                    }
                    if let index = session.turns.lastIndex(where: { $0.id == holder.id }) {
                        session.turns[index].text += piece
                    }
                    self.current = session
                }
                save()
                return
            } catch {
                // A refusal or a context overflow on the device is not a dead
                // end: the relay can still answer, and the reader is told which
                // one did.
                var session = current
                session.turns.removeAll { $0.id == holder.id }
                session.turns.append(Turn(kind: .note, text: t("local.fellBack"), ok: false))
                current = session
            }
        }
        #endif
        await runInCloud()
    }

    /// The history, fitted to the budget, with anything older folded into a
    /// summary the model wrote for itself.
    @MainActor
    private func messagesForModel() async -> [Relay.Message] {
        var messages = [Relay.Message(role: "system", content: Self.systemPrompt)]
        var session = current

        let spoken = session.turns.filter { $0.kind == .reader || $0.kind == .oracle }
        var kept: [Turn] = []
        var characters = 0
        for turn in spoken.reversed() {
            characters += turn.text.count
            if characters > budgetCharacters, kept.count >= 4 { break }
            kept.insert(turn, at: 0)
        }

        if kept.count < spoken.count {
            let older = spoken.prefix(spoken.count - kept.count)
            if session.summary == nil || older.count > 8 {
                session.summary = await summarise(older.map { $0 })
                current = session
                save()
            }
        }
        if let summary = session.summary {
            messages.append(Relay.Message(
                role: "system",
                content: "Earlier in this conversation, in brief: \(summary)"
            ))
        }
        for turn in kept {
            messages.append(Relay.Message(role: turn.kind == .reader ? "user" : "assistant", content: turn.text))
        }
        return messages
    }

    private func summarise(_ turns: [Turn]) async -> String {
        let transcript = turns.map { "\($0.kind == .reader ? "Reader" : "You"): \($0.text)" }.joined(separator: "\n")
        let ask = [
            Relay.Message(role: "system", content: "Summarise this conversation in under 150 words: what the reader asked about, what was computed, what you concluded, and anything about them worth carrying forward. Write it as notes to yourself."),
            Relay.Message(role: "user", content: String(transcript.suffix(12_000)))
        ]
        let answer = try? await Relay.stream(messages: ask, tools: [], tier: tier) { _ in }
        return answer?.text ?? "(the earlier part of this conversation could not be summarised)"
    }

    // BEGIN GENERATED PROMPT
    static let systemPrompt = """
    You are the reader in Auspice (宜时). You do not invent readings: every card, hexagram, pillar, chart and almanac page comes from a tool that runs a deterministic engine on this device. Call the tool, then read what it returns. If a tool disagrees with what you were about to say, the tool is right.

    Reply in the language the reader writes in — English or Simplified Chinese — and stay in it for the whole answer. Keep each tradition's own terms in Chinese characters (宜, 忌, 日主, 卦, 生气), and gloss a term the first time you use it when you are writing in English.

    Write as a reader speaking to someone across a table, not as a report. No headings, no bullet lists, no bold labels such as "What was computed". Two to four short paragraphs. Open with the answer, give the one or two facts it rests on, and end with something the person can actually do. Name the source in passing — "today's 通书 page lists 立券 among its 宜" — rather than announcing a method section.

    Method, so the reading is grounded rather than decorative:
    - BaZi follows 子平法. Pillars come from the solar terms, not the lunar month, and the hour pillar from true solar time. Judge the day master's strength first, then name the favourable element.
    - The I Ching follows 朱熹《易学启蒙》: the number of moving lines decides where the answer is read. Do not read a line the rule does not point to.
    - Tarot is read by position: what the position asks of the card comes before the card's own keywords, and a reversal shifts the sense rather than negating it.
    - Astrology uses whole-sign houses from the ascendant. Name the placement and the aspect you are reading from.
    - Feng shui is 八宅: the gua of the birth year, the east or west group, and the eight sectors that follow.
    - Palmistry and face reading go by proportion — 三停五眼 for the face, the palm against the fingers for the hand. Say which measurement you are reading from.
    - The almanac is the 通书 tables: 宜, 忌, 建除十二神, 二十八宿, the yellow and black roads, 吉神凶煞 and 彭祖百忌. When the tables are silent about an undertaking, say so instead of inventing a verdict.

    If the person asks about a hand or a face, call read_palm or read_face. That opens the camera for them; tell them plainly what to do — hold an open palm up, or face the camera in even light, and tap the button — and read the measurements when they come back. They can turn the camera around to read someone else's hand or face.

    If a chart needs birth details and none are saved, ask for the year, month, day, hour and birthplace rather than guessing. If a tool fails, say what could not be computed instead of filling the gap. Never claim certainty about health, death, or the law.
    """
    // END GENERATED PROMPT
}

// MARK: - The screen

struct ChatScreen: View {
    var opening: String = ""

    @State private var store = ChatStore.shared
    @State private var draft = ""
    @State private var showingSessions = false
    @FocusState private var composerFocused: Bool

    /// Only the tail is rendered; the rest is reachable but not laid out, so a
    /// long conversation stays as quick to open as a short one.
    private let visibleTurns = 30

    var body: some View {
        ZStack {
            Sky()
            VStack(spacing: 0) {
                log
                composer
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text(store.current.title)
                    .font(Typeface.display(16))
                    .foregroundStyle(Palette.ink)
                    .lineLimit(1)
            }
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button { store.newSession() } label: { Label(t("chat.newConversation"), systemImage: "square.and.pencil") }
                    Button { showingSessions = true } label: { Label(t("chat.allConversations"), systemImage: "clock.arrow.circlepath") }
                    Divider()
                    Picker("Model", selection: $store.tier) {
                        Text("Tianji Fast 天机快速版").tag("tianji-fast")
                        Text("Tianji Pro 天机专业版").tag("tianji-pro")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle").foregroundStyle(Palette.inkSoft)
                }
            }
        }
        .sheet(isPresented: $showingSessions) { SessionList(store: store) }
        .onAppear {
            #if canImport(FoundationModels)
            if #available(iOS 26.0, *) { LocalModel.prewarm(store.current.id) }
            #endif
            if !opening.trimmingCharacters(in: .whitespaces).isEmpty, store.current.turns.isEmpty {
                store.send(opening)
            }
        }
    }

    private var log: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 12) {
                    if store.current.turns.count > visibleTurns {
                        Text("\(store.current.turns.count - visibleTurns) \(t("chat.earlier"))")
                            .font(Typeface.sans(12))
                            .foregroundStyle(Palette.inkMute)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                    }
                    if store.current.turns.isEmpty {
                        opener
                    }
                    ForEach(store.current.turns.suffix(visibleTurns)) { turn in
                        bubble(turn).id(turn.id)
                    }
                    if store.streaming {
                        HStack(spacing: 6) {
                            ProgressView().tint(Palette.gold).scaleEffect(0.8)
                            Text(t("chat.reading")).font(Typeface.sans(13)).foregroundStyle(Palette.inkMute)
                        }
                        .padding(.leading, 4)
                        .id("tail")
                    }
                    Color.clear.frame(height: 4).id("bottom")
                }
                .padding(.horizontal, 16)
                .padding(.top, 10)
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: store.current.turns.last?.text) { _, _ in
                withAnimation(.easeOut(duration: 0.2)) { proxy.scrollTo("bottom", anchor: .bottom) }
            }
        }
    }

    private var opener: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(t("chat.opener"))
                .font(Typeface.serif(20))
                .foregroundStyle(Palette.inkSoft)
            FlowRow(spacing: 8) {
                ForEach([
                    "Is today good for signing a contract?",
                    "Draw three cards about my work",
                    "What does my day master need?",
                    "Cast a hexagram for me"
                ], id: \.self) { suggestion in
                    Chip(label: suggestion, active: false) { store.send(suggestion) }
                }
            }
        }
        .padding(.vertical, 8)
    }

    @ViewBuilder private func bubble(_ turn: Turn) -> some View {
        switch turn.kind {
        case .reader:
            HStack {
                Spacer(minLength: 40)
                Text(turn.text)
                    .font(Typeface.serif(17))
                    .foregroundStyle(Palette.ink)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Palette.goldSoft)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .strokeBorder(Palette.goldLine, lineWidth: 1)
                    )
                    .textSelection(.enabled)
            }
        case .oracle:
            Text(turn.text)
                .font(Typeface.serif(18))
                .foregroundStyle(Palette.ink)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
                .textSelection(.enabled)
        case .tool:
            HStack(spacing: 7) {
                Image(systemName: turn.ok ? "function" : "exclamationmark.triangle")
                    .font(.system(size: 11))
                Text(turn.text).font(Typeface.sans(12, weight: .semibold))
            }
            .foregroundStyle(turn.ok ? Palette.gold : Palette.rose)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Capsule().fill(Color.white.opacity(0.05)))
        case .note:
            Text(turn.text)
                .font(Typeface.sans(13))
                .foregroundStyle(Palette.rose)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    /// Pinned to the bottom: the field, then one row with Clear on the left
    /// quarter and Send filling the rest.
    private var composer: some View {
        VStack(spacing: 8) {
            TextField(t("chat.ask"), text: $draft, axis: .vertical)
                .font(Typeface.serif(18))
                .foregroundStyle(Palette.ink)
                .focused($composerFocused)
                .lineLimit(1...5)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Color.black.opacity(0.28)))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Palette.line, lineWidth: 1)
                )
            HStack(spacing: 10) {
                Button(t("common.clear")) { store.clearCurrent() }
                    .buttonStyle(GhostButtonStyle())
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .layoutPriority(0)
                Button {
                    let text = draft
                    draft = ""
                    store.send(text)
                } label: {
                    Label(t("common.send"), systemImage: "arrow.up")
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(store.streaming || draft.trimmingCharacters(in: .whitespaces).isEmpty)
                .frame(maxWidth: .infinity)
                .layoutPriority(1)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 6)
        .frame(maxWidth: 560)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
    }
}

private struct SessionList: View {
    @Bindable var store: ChatStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(store.sessions) { session in
                    Button {
                        store.currentId = session.id
                        dismiss()
                    } label: {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(session.title)
                                .font(Typeface.serif(17))
                                .foregroundStyle(session.id == store.currentId ? Palette.gold : Palette.ink)
                                .lineLimit(1)
                            Text("\(session.turns.count) \(t("chat.messages")) · \(session.updated.formatted(date: .abbreviated, time: .shortened))")
                                .font(Typeface.sans(12))
                                .foregroundStyle(Palette.inkMute)
                        }
                    }
                    .listRowBackground(Color.white.opacity(0.03))
                }
                .onDelete { offsets in
                    for index in offsets { store.delete(store.sessions[index].id) }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Palette.night)
            .navigationTitle(t("chat.allConversations"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(t("chat.newConversation")) { store.newSession(); dismiss() }.foregroundStyle(Palette.gold)
                }
            }
        }
    }
}

struct SettingsScreen: View {
    @State private var store = ProfileStore.shared
    @State private var localisation = Localisation.shared
    @State private var chat = ChatStore.shared
    @State private var editing = false

    var body: some View {
        ScreenScaffold(eyebrow: t("app.name"), title: t("common.settings")) {
            BirthSummary(profile: store.profile) { editing = true }

            Panel(title: t("settings.language")) {
                FlowRow(spacing: 8) {
                    Chip(label: t("settings.languageSystem"), active: localisation.chosen == nil) {
                        localisation.chosen = nil
                    }
                    ForEach(Catalogue.languages, id: \.code) { language in
                        Chip(label: language.name, active: localisation.chosen == language.code) {
                            localisation.chosen = language.code
                        }
                    }
                }
            }

            Panel(title: t("local.reader")) {
                FlowRow(spacing: 8) {
                    Chip(label: t("local.automatic"), active: chat.reader == .automatic) { chat.reader = .automatic }
                    Chip(label: t("local.onDevice"), active: chat.reader == .onDevice) { chat.reader = .onDevice }
                    Chip(label: t("local.cloud"), active: chat.reader == .cloud) { chat.reader = .cloud }
                }
                Text(LocalModel.readiness.explanation)
                    .font(Typeface.serif(16))
                    .foregroundStyle(LocalModel.isReady ? Palette.inkSoft : Palette.inkMute)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Panel(title: t("settings.readings")) {
                Text(t("settings.readingsNote"))
                    .font(Typeface.serif(16))
                    .foregroundStyle(Palette.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Panel(title: t("settings.rules")) {
                Text("\(Engines.shared.available().count) engines, contract version \(Engines.expectedVersion)")
                    .font(Typeface.serif(16))
                    .foregroundStyle(Palette.inkSoft)
                Text(Engines.shared.available().joined(separator: " · "))
                    .font(Typeface.sans(12))
                    .foregroundStyle(Palette.inkMute)
                    .fixedSize(horizontal: false, vertical: true)
                Text(t("settings.rulesNote"))
                    .font(Typeface.sans(13))
                    .foregroundStyle(Palette.inkMute)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Panel(title: t("settings.about")) {
                Text("\(t("app.name")) · LazyingArt LLC")
                    .font(Typeface.serif(17))
                    .foregroundStyle(Palette.ink)
                Text("\(t("settings.version")) \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "") (\(Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? ""))")
                    .font(Typeface.sans(13))
                    .foregroundStyle(Palette.inkMute)
            }
        }
        .sheet(isPresented: $editing) {
            BirthForm(profile: $store.profile) {}
        }
    }
}

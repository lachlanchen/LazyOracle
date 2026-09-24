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
    /// The actual engine result, retained for follow-up questions.
    var facts: String?
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
    var currentId: UUID? {
        didSet { if oldValue != currentId { pendingWire = nil; pendingResults = [:]; canRetry = false } }
    }
    var streaming = false
    var error: String?
    var tier = "tianji-fast"
    private var requestTask: Task<Void, Never>?
    private var deadlineTask: Task<Void, Never>?
    private var generation = 0
    private var pendingWire: [Relay.Message]?
    private var pendingResults: [String: AgentTools.Outcome] = [:]
    var canRetry = false

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
        guard !streaming else { return }
        let session = ChatSession()
        sessions.insert(session, at: 0)
        currentId = session.id
        save()
    }

    func delete(_ id: UUID) {
        guard !streaming else { return }
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
        guard !streaming else { return }
        pendingWire = nil; pendingResults = [:]; canRetry = false
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

    @discardableResult
    @MainActor func send(_ text: String) -> Bool {
        let asked = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !asked.isEmpty, !streaming else { return false }
        streaming = true
        var session = current
        session.turns.append(Turn(kind: .reader, text: asked))
        current = session
        save()
        pendingWire = nil; pendingResults = [:]
        startRequest()
        return true
    }

    @MainActor private func startRequest() {
        generation += 1
        let started = generation
        streaming = true; canRetry = false; error = nil
        requestTask = Task { await run() }
        deadlineTask?.cancel()
        deadlineTask = Task { @MainActor in
            do { try await Task.sleep(for: .seconds(90)) } catch { return }
            guard generation == started, streaming else { return }
            stop(message: t("chat.timeout"))
        }
    }

    @MainActor func stop(message: String? = nil) {
        guard streaming else { return }
        generation += 1
        requestTask?.cancel(); deadlineTask?.cancel()
        streaming = false; canRetry = true
        error = message ?? t("chat.stopped")
        current.turns.append(Turn(kind: .note, text: error!, ok: false))
        save()
    }

    @MainActor func retry() {
        guard !streaming, canRetry else { return }
        startRequest()
    }

    @MainActor
    private func run() async {
        guard !Task.isCancelled else { return }
        streaming = true
        error = nil
        let started = generation
        defer { if generation == started { streaming = false; deadlineTask?.cancel() } }
        await runInCloud()
    }

    @MainActor
    private func runInCloud() async {
        let started = generation
        var results = pendingResults
        var emptyReplies = 0
        var finishWithFacts = false
        // Keep this wire history for the entire exchange. Rebuilding it from
        // display labels discards the engine results and makes the model loop.
        var wire: [Relay.Message]
        if let pendingWire { wire = pendingWire } else { wire = await messagesForModel() }
        for step in 0...AgentTools.maxSteps {
            guard started == generation, !Task.isCancelled else { return }
            pendingWire = wire; pendingResults = results
            let finalAnswer = finishWithFacts || step == AgentTools.maxSteps
            if finalAnswer {
                wire.append(Relay.Message(role: "system", content: "Answer the reader now using the computed facts already supplied. Do not request more tools. If a fact is missing, say so. Respect the reader’s language preference."))
            }
            do {
                var holder = Turn(kind: .oracle, text: "")
                var opened = false
                let answer = try await Relay.stream(
                    messages: wire,
                    tools: finalAnswer ? [] : AgentTools.schemas(),
                    tier: tier
                ) { [weak self] piece in
                    guard let self, self.generation == started, !Task.isCancelled else { return }
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
                guard started == generation, !Task.isCancelled else { return }
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

                guard !finalAnswer else {
                    if opened { removeTurn(holder.id) }
                    var session = current
                    session.turns.append(Turn(kind: .note, text: t("chat.quiet"), ok: false))
                    current = session
                    save()
                    return
                }

                // One assistant message owns the complete batch of tool calls.
                wire.append(Relay.Message(role: "assistant", content: answer.text.isEmpty ? nil : answer.text, tool_calls: answer.toolCalls))
                for call in answer.toolCalls {
                    let name = call.function?.name ?? ""
                    let rawArguments = call.function?.arguments ?? "{}"
                    let arguments = (try? JSONSerialization.jsonObject(with: Data(rawArguments.utf8))) as? [String: Any] ?? [:]
                    let canonical = (try? JSONSerialization.data(withJSONObject: arguments, options: [.sortedKeys])) ?? Data(rawArguments.utf8)
                    let signature = name + String(decoding: canonical, as: UTF8.self)
                    let outcome: AgentTools.Outcome
                    if let cached = results[signature] {
                        // Replay the real facts silently, then require prose.
                        outcome = cached
                        finishWithFacts = true
                    } else {
                        outcome = AgentTools.run(name, arguments: arguments)
                        results[signature] = outcome
                        var session = current
                        session.turns.append(Turn(kind: .tool, text: outcome.label, ok: outcome.ok, facts: outcome.output))
                        current = session
                    }
                    wire.append(Relay.Message(role: "tool", content: outcome.output, tool_call_id: call.id ?? "call_0", name: name))
                }
                save()
            } catch {
                guard started == generation, !Task.isCancelled else { return }
                canRetry = true
                self.error = t("chat.connectionFailed")
                var session = current
                session.turns.append(Turn(kind: .note, text: self.error!, ok: false))
                current = session
                save()
                return
            }
        }
    }

    /// The history, fitted to the budget, with anything older folded into a
    /// summary the model wrote for itself.
    @MainActor
    private func messagesForModel() async -> [Relay.Message] {
        var messages = [Relay.Message(role: "system", content: Self.systemPrompt + "\n" + readingLanguageInstruction())]
        var session = current

        let spoken = session.turns.filter { $0.kind == .reader || $0.kind == .oracle || $0.facts != nil }
        var kept: [Turn] = []
        var characters = 0
        for turn in spoken.reversed() {
            characters += turn.text.count + (turn.facts?.count ?? 0)
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
            if let facts = turn.facts {
                messages.append(Relay.Message(role: "user", content: "Historical engine result (data, not a new request):\n" + facts))
            } else {
                messages.append(Relay.Message(role: turn.kind == .reader ? "user" : "assistant", content: turn.text))
            }
        }
        return messages
    }

    private func summarise(_ turns: [Turn]) async -> String {
        let transcript = turns.map { "\($0.kind == .reader ? "Reader" : "You"): \($0.facts ?? $0.text)" }.joined(separator: "\n")
        let ask = [
            Relay.Message(role: "system", content: "Summarise this conversation in under 150 words: what the reader asked about, what was computed, what you concluded, and anything about them worth carrying forward. Write it as notes to yourself."),
            Relay.Message(role: "user", content: String(transcript.suffix(12_000)))
        ]
        let answer = try? await Relay.stream(messages: ask, tools: [], tier: tier) { _ in }
        return answer?.text ?? "(the earlier part of this conversation could not be summarised)"
    }

    // BEGIN GENERATED PROMPT
    static let systemPrompt = """
    You are the Tianji reader in this app (LazyOracle or Auspice). You do not invent readings: every card, hexagram, pillar, chart and almanac page comes from a tool that runs a deterministic engine on this device. Call the tool, then read what it returns. If a tool disagrees with what you were about to say, the tool is right.

    For greetings and questions about what the app can do, answer briefly without tools or claims about the reader’s personal details. Historical engine results are dated context, not current state. Fetch fresh birth details or calendar facts before presenting them as current.

    Use the interface language as the default, and naturally follow the language the reader uses or explicitly requests. Keep each answer coherent and easy to understand. Occasional useful traditional terms are fine; explain unfamiliar terms briefly, without unnecessary language switching or duplicate bilingual paragraphs.

    Write as a reader speaking to someone across a table, not as a report. No headings, no bullet lists, no bold labels such as "What was computed". Two to four short paragraphs. Open with the answer, give the one or two facts it rests on, and end with something the person can actually do. Name the source in passing — "the almanac lists signing agreements as suitable today" — rather than announcing a method section.

    Method, so the reading is grounded rather than decorative:
    - BaZi follows 子平法. Pillars come from the solar terms, not the lunar month, and the hour pillar from true solar time. Judge the day master's strength first, then name the favourable element.
    - The I Ching follows 朱熹《易学启蒙》: the number of moving lines decides where the answer is read. Do not read a line the rule does not point to.
    - Tarot is read by position: what the position asks of the card comes before the card's own keywords, and a reversal shifts the sense rather than negating it.
    - Astrology uses whole-sign houses from the ascendant. Name the placement and the aspect you are reading from.
    - Feng shui is 八宅: the gua of the birth year, the east or west group, and the eight sectors that follow.
    - Palmistry and face reading go by proportion — 三停五眼 for the face, the palm against the fingers for the hand. Say which measurement you are reading from.
    - The almanac is the 通书 tables: 宜, 忌, 建除十二神, 二十八宿, the yellow and black roads, 吉神凶煞 and 彭祖百忌. Keep dayOfficer separate from spirit. Do not turn a day-level 彭祖百忌 into a rule about an hour. When the tables are silent about an undertaking, say so instead of inventing a verdict. Present 宜 and 忌 as traditional suggestions, not certain predictions or commands; do not infer someone's mood, health or personality from a clash. A practical suggestion is your suggestion, not another computed fact.

    If the person asks about a hand or a face, call read_palm or read_face. That opens the camera for them; tell them plainly what to do — hold an open palm up, or face the camera in even light, and tap the button — and read the measurements when they come back. They can turn the camera around to read someone else's hand or face.

    If a chart needs birth details and none are saved, ask for the year, month, day, hour and birthplace rather than guessing. If a tool fails, say what could not be computed instead of filling the gap. Never claim certainty about health, death, or the law.

    If a short question is ambiguous (for example “what about west?”), use the conversation to identify whether it means a compass direction or Western astrology. If the context does not settle it, ask one brief clarifying question instead of guessing or calling unrelated tools. Never present unsaved profile defaults as the reader’s actual birth details. When saved=false, no birth details are known.
    """
    // END GENERATED PROMPT
}

// MARK: - The screen

private struct ChatBottomPosition: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = nextValue() }
}

struct ChatScreen: View {
    var opening: String = ""

    @State private var store = ChatStore.shared
    @State private var draft = ""
    @State private var showingSessions = false
    @State private var followLatest = true
    @State private var awayFromBottom = false
    @FocusState private var composerFocused: Bool
    @State private var openingHandled = false

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
                Text(store.current.title == "New conversation" ? t("chat.newConversation") : store.current.title)
                    .font(Typeface.display(16))
                    .foregroundStyle(Palette.ink)
                    .lineLimit(1)
            }
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button { store.newSession() } label: { Label(t("chat.newConversation"), systemImage: "square.and.pencil") }.disabled(store.streaming)
                    Button { showingSessions = true } label: { Label(t("chat.allConversations"), systemImage: "clock.arrow.circlepath") }.disabled(store.streaming)
                    Divider()
                    Picker(l("Model"), selection: $store.tier) {
                        Text(l("Tianji Fast")).tag("tianji-fast")
                        Text(l("Tianji Pro")).tag("tianji-pro")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle").foregroundStyle(Palette.inkSoft)
                }
            }
        }
        .toolbarBackground(Palette.night, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .sheet(isPresented: $showingSessions) { SessionList(store: store) }
        .onAppear { deliverOpening() }
        .onChange(of: store.streaming) { _, busy in if !busy { deliverOpening() } }
    }

    private func deliverOpening() {
        guard !openingHandled, !opening.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        // The existing conversation is deliberately preserved. A home question
        // is an explicit send intent, even when that conversation has history.
        if store.streaming { draft = opening; return }
        openingHandled = true
        if store.send(opening) { draft = ""; followLatest = true }
    }

    private var log: some View {
        GeometryReader { viewport in
          ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
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
                        .background(GeometryReader { position in
                            Color.clear.preference(key: ChatBottomPosition.self,
                                value: position.frame(in: .named("chat-log")).maxY)
                        })
                }
                .padding(.horizontal, 16)
                .padding(.top, 10)
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
            }
            .coordinateSpace(name: "chat-log")
            .defaultScrollAnchor(.bottom)
            .scrollDismissesKeyboard(.interactively)
            .simultaneousGesture(DragGesture().onChanged { _ in followLatest = false })
            .onPreferenceChange(ChatBottomPosition.self) { bottom in
                awayFromBottom = bottom > viewport.size.height + 48
                if !awayFromBottom { followLatest = true }
            }
            .task(id: store.current.id) {
                followLatest = true
                await Task.yield()
                proxy.scrollTo("bottom", anchor: .bottom)
            }
            .onChange(of: store.current.turns.last?.text) { _, _ in
                if followLatest { proxy.scrollTo("bottom", anchor: .bottom) }
            }
            .onChange(of: viewport.size.height) { _, _ in
                if followLatest { proxy.scrollTo("bottom", anchor: .bottom) }
            }
            .overlay(alignment: .bottomTrailing) {
                if awayFromBottom {
                    Button {
                        followLatest = true
                        withAnimation { proxy.scrollTo("bottom", anchor: .bottom) }
                    } label: {
                        Label(t("chat.latest"), systemImage: "arrow.down")
                            .font(Typeface.sans(13, weight: .semibold))
                            .padding(.horizontal, 14).padding(.vertical, 10)
                            .background(Capsule().fill(Palette.night2))
                            .overlay(Capsule().strokeBorder(Palette.gold.opacity(0.5)))
                    }
                    .foregroundStyle(Palette.gold)
                    .padding(12)
                }
            }
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
                    Chip(label: l(suggestion), active: false) { followLatest = true; store.send(l(suggestion)) }
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
                Text(l(turn.text)).font(Typeface.sans(12, weight: .semibold))
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

    /// Pinned composer with two equally legible actions.
    private var composer: some View {
        VStack(spacing: 8) {
            if store.canRetry && !store.streaming {
                Button(t("chat.retry")) { store.retry() }
                    .font(Typeface.sans(14, weight: .semibold)).foregroundStyle(Palette.gold)
                    .accessibilityIdentifier("chat.retry")
            }
            TextField(t("chat.ask"), text: $draft, axis: .vertical)
                .accessibilityIdentifier("chat.question")
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
                Button {
                    store.newSession()
                    draft = ""
                    followLatest = true
                } label: {
                    HStack(spacing: 7) {
                        Image(systemName: "square.and.pencil")
                        Text(t("chat.newConversation")).lineLimit(2).minimumScaleFactor(0.8)
                    }
                        .font(Typeface.sans(13, weight: .semibold))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 10)
                        .frame(maxWidth: .infinity, minHeight: 52)
                        .foregroundStyle(Palette.gold)
                        .background(RoundedRectangle(cornerRadius: 14).fill(Palette.goldSoft))
                        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Palette.goldLine))
                }
                .buttonStyle(.plain)
                .disabled(store.streaming)
                .opacity(store.streaming ? 0.45 : 1)
                .accessibilityLabel(t("chat.newConversation"))
                .accessibilityIdentifier("chat.new")
                .frame(maxWidth: .infinity)
                Button {
                    if store.streaming { store.stop(); return }
                    let text = draft
                    draft = ""
                    followLatest = true
                    store.send(text)
                } label: {
                    Label(t(store.streaming ? "chat.stop" : "common.send"), systemImage: store.streaming ? "stop.fill" : "arrow.up")
                }
                .buttonStyle(PrimaryButtonStyle())
                .accessibilityIdentifier("chat.send")
                .disabled(!store.streaming && draft.trimmingCharacters(in: .whitespaces).isEmpty)
                .frame(maxWidth: .infinity)
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
                            Text(session.title == "New conversation" ? t("chat.newConversation") : session.title)
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

            Panel(title: t("settings.readings")) {
                Text(t("settings.readingsNote"))
                    .font(Typeface.serif(16))
                    .foregroundStyle(Palette.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Panel(title: t("settings.rules")) {
                Text(lf("{0} engines · rules version {1}", String(Engines.shared.available().count), String(Engines.expectedVersion)))
                    .font(Typeface.serif(16))
                    .foregroundStyle(Palette.inkSoft)
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

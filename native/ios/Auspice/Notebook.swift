import SwiftUI
import CryptoKit

struct NotebookSummary: Codable { let question: String; let lines: [[String]] }
struct NotebookEntry: Codable, Identifiable {
    let id: String
    let practice: String
    let createdAt: Date
    let facts: String
    let summary: NotebookSummary
    var reflection = ""
    var action = ""
    var observation = ""
    var reviewed = false
}
struct NotebookArchive: Codable { var version = 1; var entries: [NotebookEntry] = [] }

/// One atomic file, separate from existing practice/chat storage. A damaged
/// archive is never replaced with an empty one after a failed load.
@Observable final class NotebookStore {
    static let shared = NotebookStore()
    private(set) var entries: [NotebookEntry] = []
    private(set) var error: String?
    private let file: URL
    private var readable = true
    init(file: URL? = nil) {
        self.file = file ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("reading-notebook-v1.json")
        guard FileManager.default.fileExists(atPath: self.file.path) else { return }
        do {
            let archive = try JSONDecoder().decode(NotebookArchive.self, from: Data(contentsOf: self.file))
            guard archive.version == 1 else { throw CocoaError(.fileReadCorruptFile) }
            entries = archive.entries
        } catch { readable = false; self.error = "notebook.error" }
    }
    static func identity(practice: String, facts: String) -> String {
        let raw = Data(facts.utf8)
        let canonical = (try? JSONSerialization.jsonObject(with: raw)).flatMap { try? JSONSerialization.data(withJSONObject: $0, options: [.sortedKeys]) } ?? raw
        return SHA256.hash(data: Data((practice + "\n").utf8) + canonical).map { String(format: "%02x", $0) }.joined()
    }
    @discardableResult func save(practice: String, facts: String) -> Bool {
        let id = Self.identity(practice: practice, facts: facts)
        if entries.contains(where: { $0.id == id }) { return true }
        do {
            let result = try JSONSerialization.jsonObject(with: Data(facts.utf8))
            let summary = try Engines.shared.evaluate("notebook.summary", ["practice": practice, "result": result], as: NotebookSummary.self)
            return persist([NotebookEntry(id: id, practice: practice, createdAt: Date(), facts: facts, summary: summary)] + entries)
        } catch { self.error = "notebook.error"; return false }
    }
    @discardableResult func update(_ entry: NotebookEntry) -> Bool {
        guard let original = entries.first(where: { $0.id == entry.id }), original.facts == entry.facts, original.practice == entry.practice else { return false }
        var updated = original
        updated.reflection = entry.reflection; updated.action = entry.action
        updated.observation = entry.observation; updated.reviewed = entry.reviewed
        return persist(entries.map { $0.id == entry.id ? updated : $0 })
    }
    private func persist(_ next: [NotebookEntry]) -> Bool {
        guard readable else { return false }
        do {
            try FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
            try JSONEncoder().encode(NotebookArchive(entries: next)).write(to: file, options: .atomic)
            entries = next; error = nil; return true
        } catch { self.error = "notebook.error"; return false }
    }
}

func notebookName(_ practice: String) -> String { t(practice == "atlas" ? "study.title" : "practice." + practice) }
func notebookLines(_ summary: NotebookSummary) -> String { summary.lines.map { $0.map(l).joined(separator: " · ") }.joined(separator: "\n") }

struct SaveReadingButton: View {
    let practice: String
    let facts: String
    @State private var notebook = NotebookStore.shared
    var body: some View {
        let saved = notebook.entries.contains { $0.id == NotebookStore.identity(practice: practice, facts: facts) }
        VStack(alignment: .leading, spacing: 6) {
            Button { notebook.save(practice: practice, facts: facts) } label: {
                Label(t(saved ? "notebook.saved" : "notebook.save"), systemImage: saved ? "checkmark.circle.fill" : "book.closed")
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.bordered).tint(Palette.gold)
            .disabled(saved).accessibilityIdentifier("notebook.save")
            if let error = notebook.error { Text(t(error)).foregroundStyle(Palette.rose).font(Typeface.sans(14)) }
        }
    }
}

struct NotebookScreen: View {
    @State private var notebook = NotebookStore.shared
    @State private var pending = false
    var body: some View {
        ScreenScaffold(eyebrow: t("app.name"), title: t("notebook.title"), tagline: t("notebook.tagline"), bottomPadding: 28) {
            Toggle(t("notebook.pending"), isOn: $pending).tint(Palette.gold)
            if let error = notebook.error { Text(t(error)).foregroundStyle(Palette.rose) }
            let entries = notebook.entries.filter { !pending || !$0.reviewed }
            if entries.isEmpty {
                Panel { Text(t("notebook.empty")).foregroundStyle(Palette.inkSoft) }
            }
            ForEach(entries) { entry in
                NavigationLink { NotebookDetail(entry: entry) } label: {
                    Panel {
                        HStack {
                            Text(notebookName(entry.practice)).font(Typeface.display(21)).foregroundStyle(Palette.gold)
                            Spacer()
                            Image(systemName: entry.reviewed ? "checkmark.circle" : "circle.dashed").foregroundStyle(Palette.gold)
                        }
                        Text(entry.createdAt, style: .date).font(Typeface.sans(12)).foregroundStyle(Palette.inkMute)
                        if !entry.summary.question.isEmpty { Text(entry.summary.question).foregroundStyle(Palette.ink) }
                        Text(notebookLines(entry.summary)).font(Typeface.serif(17)).foregroundStyle(Palette.inkSoft).lineLimit(3)
                    }
                }.buttonStyle(.plain).accessibilityIdentifier("notebook.entry.\(entry.practice)")
            }
            Text(t("notebook.privacy")).font(Typeface.sans(13)).foregroundStyle(Palette.inkMute)
        }
    }
}

struct NotebookDetail: View {
    @State var entry: NotebookEntry
    @State private var saved = false
    @FocusState private var editing: Bool
    @State private var notebook = NotebookStore.shared
    var body: some View {
        ScreenScaffold(eyebrow: t("notebook.title"), title: notebookName(entry.practice), tagline: entry.createdAt.formatted(date: .abbreviated, time: .shortened), bottomPadding: 28) {
            Panel(title: t("notebook.original")) {
                if !entry.summary.question.isEmpty { Text(entry.summary.question).foregroundStyle(Palette.gold) }
                Text(notebookLines(entry.summary)).font(Typeface.serif(18)).foregroundStyle(Palette.ink).textSelection(.enabled)
                    .accessibilityIdentifier("notebook.original")
            }
            Panel {
                note("notebook.reflection", $entry.reflection)
                note("notebook.action", $entry.action)
                note("notebook.observation", $entry.observation)
                Toggle(t("notebook.reviewed"), isOn: $entry.reviewed).tint(Palette.gold)
                Button(t(saved ? "notebook.notesSaved" : "notebook.saveNotes")) { saved = notebook.update(entry); if saved { editing = false } }
                    .buttonStyle(PrimaryButtonStyle()).accessibilityIdentifier("notebook.saveNotes")
                if let error = notebook.error { Text(t(error)).foregroundStyle(Palette.rose) }
            }
            ShareLink(item: exportText) { Label(t("notebook.export"), systemImage: "square.and.arrow.up").frame(minHeight: 44) }
            Text(t("notebook.privacy")).font(Typeface.sans(13)).foregroundStyle(Palette.inkMute)
        }
        .onChange(of: entry.reflection) { _, _ in saved = false }
        .onChange(of: entry.action) { _, _ in saved = false }
        .onChange(of: entry.observation) { _, _ in saved = false }
        .onChange(of: entry.reviewed) { _, _ in saved = false }
    }
    private func note(_ key: String, _ value: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(t(key)).font(Typeface.sans(14, weight: .bold)).foregroundStyle(Palette.gold)
            TextField(t(key), text: value, axis: .vertical).lineLimit(3...8).textFieldStyle(AuspiceFieldStyle()).focused($editing).accessibilityIdentifier(key)
        }
    }
    private var exportText: String {
        ["LazyOracle · " + notebookName(entry.practice), entry.createdAt.formatted(), entry.summary.question,
         t("notebook.original"), notebookLines(entry.summary), t("notebook.reflection"), entry.reflection,
         t("notebook.action"), entry.action, t("notebook.observation"), entry.observation].joined(separator: "\n\n")
    }
}

import Foundation
import WebKit
import CryptoKit

/// One local read of the former Capacitor storage. No web UI, network request,
/// deletion or write-back is involved; the original data survives rollback.
@MainActor final class LegacyImport: NSObject, WKNavigationDelegate, WKURLSchemeHandler {
    static let shared = LegacyImport()
    private var web: WKWebView?
    private var completion: (() -> Void)?
    private var deadline: Task<Void, Never>?
    private let doneKey = "native.classic-import.v1"

    func run() async {
        guard Bundle.main.bundleIdentifier == "art.lazying.lazyoracle",
              !UserDefaults.standard.bool(forKey: doneKey), web == nil else { return }
        await withCheckedContinuation { continuation in
            completion = { continuation.resume() }
            let config = WKWebViewConfiguration()
            config.setURLSchemeHandler(self, forURLScheme: "capacitor")
            let view = WKWebView(frame: .zero, configuration: config)
            web = view; view.navigationDelegate = self
            view.load(URLRequest(url: URL(string: "capacitor://localhost/")!))
            deadline = Task { @MainActor in
                do { try await Task.sleep(for: .seconds(5)) } catch { return }
                finish()
            }
        }
    }
    private func finish() {
        deadline?.cancel(); deadline = nil
        web?.stopLoading(); web?.navigationDelegate = nil; web = nil
        let callback = completion; completion = nil; callback?()
    }
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        let bytes = Data("<!doctype html><meta charset=utf-8>".utf8)
        urlSchemeTask.didReceive(URLResponse(url: urlSchemeTask.request.url!, mimeType: "text/html", expectedContentLength: bytes.count, textEncodingName: "utf-8"))
        urlSchemeTask.didReceive(bytes); urlSchemeTask.didFinish()
    }
    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { finish() }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { finish() }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.evaluateJavaScript("JSON.stringify(Object.fromEntries(['lazyoracle.profile','lazyoracle.language','lazyoracle.chats'].map(k=>[k,localStorage.getItem(k)])))") { [weak self] value, error in
            guard let self, self.completion != nil else { return }
            if error == nil, let text = value as? String, let data = text.data(using: .utf8),
               let payload = try? JSONDecoder().decode([String: String?].self, from: data) {
                self.apply(payload.compactMapValues { $0 })
                UserDefaults.standard.set(true, forKey: self.doneKey)
            }
            self.finish()
        }
    }
    /// Kept separate so conversion/idempotency can be checked without WebKit.
    func apply(_ payload: [String: String]) {
        UserDefaults.standard.set(payload, forKey: "native.classic-import.backup")
        if UserDefaults.standard.data(forKey: "auspice.profile") == nil,
           let raw = payload["lazyoracle.profile"], let bytes = raw.data(using: .utf8),
           let profile = try? JSONDecoder().decode(BirthProfile.self, from: bytes) {
            ProfileStore.shared.profile = profile
        }
        if Localisation.shared.chosen == nil, let code = payload["lazyoracle.language"], Catalogue.languages.contains(where: { $0.code == code }) {
            Localisation.shared.chosen = code
        }
        guard let raw = payload["lazyoracle.chats"], let bytes = raw.data(using: .utf8),
              let legacy = try? JSONDecoder().decode([LegacyConversation].self, from: bytes) else { return }
        let store = ChatStore.shared
        let currentWasEmpty = store.current.turns.isEmpty
        for old in legacy {
            let hex = SHA256.hash(data: Data(old.id.utf8)).map { String(format: "%02x", $0) }.joined()
            let groups = [8,4,4,4,12]; var position = hex.startIndex
            let uuidText = groups.map { count -> String in
                let end = hex.index(position, offsetBy: count); defer { position = end }
                return String(hex[position..<end])
            }.joined(separator: "-")
            guard let id = UUID(uuidString: uuidText), !store.sessions.contains(where: { $0.id == id }) else { continue }
            var session = ChatSession(id: id, title: old.title)
            session.updated = Date(timeIntervalSince1970: old.updatedAt / 1000)
            session.summary = old.summary
            session.turns = old.turns.map { turn in
                Turn(kind: turn.role == "user" ? .reader : turn.role == "tool" ? .tool : .oracle,
                     text: turn.content,
                     facts: turn.role == "tool" ? turn.facts : nil)
            }
            store.sessions.append(session)
        }
        store.sessions.sort { $0.updated > $1.updated }
        if currentWasEmpty, let latest = store.sessions.first(where: { !$0.turns.isEmpty }) { store.currentId = latest.id }
        store.save()
    }
}

struct LegacyConversation: Decodable {
    struct LegacyTurn: Decodable { var role: String; var content: String; var facts: String? }
    var id: String
    var title: String
    var turns: [LegacyTurn]
    var updatedAt: Double
    var summary: String?
}

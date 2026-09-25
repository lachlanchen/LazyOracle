import WebKit

/// Sandboxed on-device compute host for the same MediaPipe weights/topology.
/// No web interface, listening port, remote assets or saved camera images.
@MainActor final class MacVision: NSObject, WKNavigationDelegate, WKURLSchemeHandler {
    private var web: WKWebView?
    private var pending: ((Result<Any, Error>) -> Void)?
    private var timeout: Task<Void, Never>?
    private let resources: URL
    private var serial = 0
    private var activity: NSObjectProtocol?
    enum Failure: Error { case unavailable, timedOut, invalidResult }

    init(resources: URL = Bundle.main.resourceURL!.appendingPathComponent("Vision")) {
        self.resources = resources
    }

    func start(kind: String) async throws {
        activity = ProcessInfo.processInfo.beginActivity(options: .userInitiated, reason: "Measure local camera frames")
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        configuration.setURLSchemeHandler(self, forURLScheme: "oracle-vision")
        let view = WKWebView(frame: CGRect(x: 0, y: 0, width: 640, height: 480), configuration: configuration)
        web = view
        view.navigationDelegate = self
        _ = try await operation {
            view.load(URLRequest(url: URL(string: "oracle-vision://bundle/index.html")!))
        }
        _ = try await evaluate("return await window.oracleVision.initialize(kind)", arguments: ["kind": kind])
    }

    func detect(jpeg: Data, timestamp: Int) async throws -> [[String: Double]] {
        let result = try await evaluate("return await window.oracleVision.detect(jpeg, timestamp)",
                                        arguments: ["jpeg": jpeg.base64EncodedString(), "timestamp": timestamp])
        guard let points = result as? [[String: Double]],
              points.allSatisfy({ p in ["x", "y", "z"].allSatisfy { p[$0]?.isFinite == true } }) else {
            throw Failure.invalidResult
        }
        return points
    }

    private func evaluate(_ script: String, arguments: [String: Any]) async throws -> Any {
        guard let web else { throw Failure.unavailable }
        return try await operation {
            let token = self.serial
            web.callAsyncJavaScript(script, arguments: arguments, in: nil, in: .page) { [weak self] result in
                guard let self, self.serial == token else { return }
                self.finish(result)
            }
        }
    }

    private func operation(_ action: () -> Void) async throws -> Any {
        guard pending == nil else { throw Failure.unavailable }
        return try await withCheckedThrowingContinuation { continuation in
            serial += 1
            pending = { continuation.resume(with: $0) }
            timeout = Task { [weak self] in
                do { try await Task.sleep(nanoseconds: 20_000_000_000) } catch { return }
                self?.finish(.failure(Failure.timedOut))
            }
            action()
        }
    }

    private func finish(_ result: Result<Any, Error>) {
        timeout?.cancel(); timeout = nil
        let callback = pending; pending = nil
        callback?(result)
    }

    func close() {
        if let activity { ProcessInfo.processInfo.endActivity(activity); self.activity = nil }
        serial += 1
        finish(.failure(Failure.unavailable))
        let old = web
        web = nil
        old?.navigationDelegate = nil
        // Releasing a WebView inside its JavaScript completion can re-enter
        // WebKit teardown. Let that callback unwind before destroying it.
        DispatchQueue.main.async { old?.stopLoading() }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { finish(.success(true)) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { finish(.failure(error)) }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { finish(.failure(error)) }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { finish(.failure(Failure.unavailable)) }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, url.host == "bundle", url.query == nil,
              !url.path.dropFirst().contains("/"), !url.path.contains(".."),
              let data = try? Data(contentsOf: resources.appendingPathComponent(url.lastPathComponent)) else {
            task.didFailWithError(Failure.unavailable); return
        }
        let mime = ["html": "text/html", "js": "application/javascript", "wasm": "application/wasm"]
        task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: [
            "Content-Type": mime[url.pathExtension] ?? "application/octet-stream",
            "Content-Length": String(data.count), "Access-Control-Allow-Origin": "*"
        ])!)
        task.didReceive(data); task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

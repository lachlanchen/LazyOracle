import Foundation
import JavaScriptCore

/// The divination rules, called from Swift.
///
/// Every rule in this product — the four pillars, the almanac's tables, the
/// tarot draw, the hexagram cast, the natal chart — is written once, in
/// TypeScript, under `src/engines/`, with golden-file tests. `LazyOracle.js` is
/// that same code built into one bundle with no DOM and no network, and this
/// type is the only thing between it and the native screens.
///
/// A second implementation in Swift would look like less work for a week and
/// then quietly disagree with the web app about someone's day master, with no
/// test able to catch it. So: native interface, shared rules.
final class Engines {
    static let shared = Engines()

    enum Failure: LocalizedError {
        case bundleMissing
        case engineFailed(String)
        case badResult

        var errorDescription: String? {
            switch self {
            case .bundleMissing: "The rules bundle is missing from the app."
            case .engineFailed(let message): message
            case .badResult: "The rules returned something unreadable."
            }
        }
    }

    /// The contract version `engine-bridge.ts` declares. A mismatch means the
    /// bundle and this app were built from different commits.
    static let expectedVersion = 1

    private let queue = DispatchQueue(label: "art.lazying.auspice.engines", qos: .userInitiated)
    private var context: JSContext?
    private var loadFailure: Error?

    private init() {
        queue.sync {
            do {
                context = try Self.makeContext()
            } catch {
                loadFailure = error
            }
        }
    }

    private static func makeContext() throws -> JSContext {
        guard let url = Bundle.main.url(forResource: "lazyoracle-engines", withExtension: "js"),
              let source = try? String(contentsOf: url, encoding: .utf8) else {
            throw Failure.bundleMissing
        }
        guard let context = JSContext() else { throw Failure.bundleMissing }
        var thrown: String?
        context.exceptionHandler = { _, exception in
            thrown = exception?.toString() ?? "unknown JavaScript error"
        }
        context.evaluateScript(source, withSourceURL: url)
        if let thrown { throw Failure.engineFailed(thrown) }
        guard context.objectForKeyedSubscript("LazyOracle")?.isObject == true else {
            throw Failure.bundleMissing
        }
        return context
    }

    /// Runs one engine and hands back its `data`, already decoded.
    ///
    /// Engines are pure and fast — a full BaZi chart is well under a
    /// millisecond — so this is synchronous on a serial queue rather than
    /// async: making every screen await a chart would buy nothing and cost a
    /// frame of latency on every tap.
    func evaluate<T: Decodable>(_ engine: String, _ input: [String: Any] = [:], as type: T.Type) throws -> T {
        let data = try evaluate(engine, input)
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw Failure.engineFailed("\(engine): \(error.localizedDescription)")
        }
    }

    /// The same call, left as JSON, for the chat agent to hand to the model.
    func evaluate(_ engine: String, _ input: [String: Any] = [:]) throws -> Data {
        try queue.sync {
            if let loadFailure { throw loadFailure }
            guard let context, let bridge = context.objectForKeyedSubscript("LazyOracle") else {
                throw Failure.bundleMissing
            }
            let request = try JSONSerialization.data(
                withJSONObject: ["engine": engine, "input": input],
                options: []
            )
            guard let requestText = String(data: request, encoding: .utf8) else { throw Failure.badResult }

            var thrown: String?
            context.exceptionHandler = { _, exception in
                thrown = exception?.toString() ?? "unknown JavaScript error"
            }
            let returned = bridge.invokeMethod("evaluateJson", withArguments: [requestText])
            if let thrown { throw Failure.engineFailed("\(engine): \(thrown)") }
            guard let text = returned?.toString(), let payload = text.data(using: .utf8),
                  let envelope = try? JSONSerialization.jsonObject(with: payload) as? [String: Any] else {
                throw Failure.badResult
            }
            guard envelope["ok"] as? Bool == true else {
                throw Failure.engineFailed(envelope["error"] as? String ?? "\(engine) failed")
            }
            if let version = envelope["version"] as? Int, version != Self.expectedVersion {
                throw Failure.engineFailed("rules bundle speaks version \(version), this app expects \(Self.expectedVersion)")
            }
            guard let body = envelope["data"] else { throw Failure.badResult }
            // Some engines return a scalar: fengshui.sector returns "N", etc.
            // Without fragmentsAllowed, Foundation raises an Objective-C
            // exception here (not a Swift Error that try?/catch can handle).
            return try JSONSerialization.data(withJSONObject: body, options: [.fragmentsAllowed])
        }
    }

    /// Which engines the bundle carries, straight from `engines()`. Used by
    /// the chat agent to advertise its tools, and by the diagnostic line in
    /// Settings when a reading will not compute.
    func available() -> [String] {
        queue.sync {
            guard let bridge = context?.objectForKeyedSubscript("LazyOracle"),
                  let listed = bridge.invokeMethod("engines", withArguments: [])?.toArray() as? [String] else {
                return []
            }
            return listed
        }
    }
}

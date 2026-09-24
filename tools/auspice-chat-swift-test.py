#!/usr/bin/env python3
"""Build a Foundation-only regression harness from the actual iOS ChatStore.

Run: python3 tools/auspice-chat-swift-test.py /tmp/chat-regression.swift
Then on a Mac: swiftc -parse-as-library chat-regression.swift -o chat-test && ./chat-test
Only persistence location/access and the relay/engine boundaries are replaced;
the production conversation loop, history, compaction and Turn models run intact.
"""
from pathlib import Path
import sys
root = Path(__file__).resolve().parent.parent
source = (root/'native/ios/Auspice/Screens/Chat.swift').read_text().split('// MARK: - The screen')[0]
source = source.replace('import SwiftUI', 'import Foundation\nimport Observation')
source = source.replace('private func runInCloud', 'func runInCloud').replace('private func messagesForModel', 'func messagesForModel')
source = source.replace('FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]', 'FileManager.default.temporaryDirectory')
source = source.replace('.appendingPathComponent("Auspice", isDirectory: true)', '.appendingPathComponent("AuspiceChatTest-" + UUID().uuidString, isDirectory: true)')
wire = (root/'native/ios/Auspice/Relay.swift').read_text().split('    // MARK: Wire format')[1].split('    private struct Delta')[0]
stubs = r'''
func t(_ key: String) -> String { key }
func readingLanguageInstruction() -> String { "English is the interface default. Naturally follow the language used or explicitly requested by the reader." }
enum AgentTools {
    static let maxSteps = 6
    struct Outcome { var label: String; var output: String; var ok: Bool }
    static var runs = 0
    static func schemas() -> [[String: Any]] { [["type": "function"]] }
    static func run(_ name: String, arguments: [String: Any]) -> Outcome {
        runs += 1
        return Outcome(label: name, output: Fixture.facts, ok: true)
    }
}
enum Relay {
WIRE
    struct Answer { var text: String; var toolCalls: [ToolCall] }
    @MainActor static var handler: (([Message], [[String: Any]], (String) -> Void) async throws -> Answer)!
    @MainActor static func stream(messages: [Message], tools: [[String: Any]], tier: String,
        onDelta: @escaping (String) -> Void) async throws -> Answer { try await handler(messages, tools, onDelta) }
}
enum Fixture {
    static let facts = #"{"date":"2026-09-23","yi":["祭祀"],"ji":["出行"]}"#
    static let prose = "今天宜祭祀，忌出行。這是今日黃曆列出的宜忌。"
    static func call(_ id: String, _ name: String, _ args: String = "{}") -> Relay.ToolCall {
        Relay.ToolCall(index: nil, id: id, type: "function", function: .init(name: name, arguments: args))
    }
    static var calls: [Relay.ToolCall] { [call("date", "today"), call("day", "almanac_day", #"{"date":"2026-09-23","activity":"travel"}"#)] }
    static func checkFacts(_ messages: [Relay.Message]) {
        precondition(messages.filter { $0.role == "tool" }.count >= 2, "Engine results dropped")
        precondition(messages.last(where: { $0.role == "tool" })?.content == facts)
        precondition(messages.first(where: { $0.tool_calls != nil })?.tool_calls?.count == 2, "Invalid batched tool protocol")
    }
}
@main struct Tests {
    @MainActor static func main() async {
        let store = ChatStore.shared
        for mode in ["batch", "repeat", "empty", "limit"] {
            store.clearCurrent()
            store.current.turns.append(Turn(kind: .reader, text: "今天適合做什麼"))
            AgentTools.runs = 0
            var requests = 0
            Relay.handler = { messages, tools, delta in
                requests += 1
                if mode == "limit" {
                    if requests <= AgentTools.maxSteps {
                        return .init(text: "", toolCalls: [Fixture.call("day-\(requests)", "almanac_day", "{\"day\":\(requests)}")])
                    }
                    precondition(tools.isEmpty)
                } else {
                    if requests == 1 { return .init(text: "", toolCalls: Fixture.calls) }
                    Fixture.checkFacts(messages)
                    if mode == "repeat" && requests == 2 {
                        return .init(text: "", toolCalls: [Fixture.call("again", "almanac_day", #"{ "activity": "travel", "date": "2026-09-23" }"#)])
                    }
                    if mode == "repeat" { precondition(tools.isEmpty) }
                    if mode == "empty" && requests == 2 { return .init(text: "", toolCalls: []) }
                }
                delta(Fixture.prose)
                return .init(text: Fixture.prose, toolCalls: [])
            }
            await store.runInCloud()
            precondition(store.current.turns.last?.text == Fixture.prose, "No final answer or stream race")
            precondition(AgentTools.runs == (mode == "limit" ? 6 : 2), "Repeated engine call")
            precondition(requests == (mode == "limit" ? 7 : mode == "batch" ? 2 : 3))
            precondition(store.current.turns.filter { $0.kind == .tool }.count == AgentTools.runs)
            let history = await store.messagesForModel()
            precondition(history.contains { $0.content?.contains(Fixture.facts) == true }, "Follow-up lost facts")
            print("PASS iOS production ChatStore: \(mode)")
        }
        store.clearCurrent()
        store.current.turns.append(Turn(kind: .reader, text: "Draw once"))
        AgentTools.runs = 0
        var requests = 0
        Relay.handler = { messages, _, _ in
            requests += 1
            if requests == 1 { return .init(text: "", toolCalls: Fixture.calls) }
            if requests == 2 { throw URLError(.networkConnectionLost) }
            Fixture.checkFacts(messages)
            return .init(text: Fixture.prose, toolCalls: [])
        }
        await store.runInCloud()
        precondition(store.canRetry)
        await store.runInCloud()
        precondition(AgentTools.runs == 2)
        precondition(store.current.turns.filter { $0.kind == .reader }.count == 1)
        precondition(store.current.turns.last?.text == Fixture.prose)
        print("PASS iOS retry retains original facts and question")

        store.clearCurrent()
        Relay.handler = { _, _, _ in
            try await Task.sleep(for: .seconds(30))
            return .init(text: "Must not appear", toolCalls: [])
        }
        store.send("Stop this slow request")
        await Task.yield()
        store.stop()
        precondition(!store.streaming && store.canRetry)
        store.newSession()
        await Task.yield()
        precondition(store.current.turns.isEmpty && !store.streaming)
        print("PASS iOS Stop and session isolation")
    }
}
'''.replace('WIRE', wire)
if '--live' in sys.argv:
    # Real ChatStore + SSE relay + tool runner + JSCore engine. Only the unused
    # profile/camera UI boundaries and bundle location are supplied by the CLI.
    relay = (root/'native/ios/Auspice/Relay.swift').read_text()
    engines = (root/'native/ios/Auspice/Engines.swift').read_text().replace(
        'Bundle.main.url(forResource: "lazyoracle-engines", withExtension: "js")',
        'Optional(URL(fileURLWithPath: CommandLine.arguments[1]))')
    profile = (root/'native/ios/Auspice/Profile.swift').read_text().split('@Observable')[0].replace('import SwiftUI', '')
    stubs = relay + engines + profile + r'''
func t(_ key: String) -> String { key }
func readingLanguageInstruction() -> String { "English is the interface default. Naturally follow the language used or explicitly requested by the reader." }
class ProfileStore { static let shared = ProfileStore(); var profile = BirthProfile() }
class Router {
    static let shared = Router()
    var palm: String?; var face: String?
    enum Route { case palm, face }
    func show(_ route: Route) { preconditionFailure("Unexpected camera request") }
}
@main struct LiveTest {
    @MainActor static func main() async {
        let store = ChatStore.shared
        store.clearCurrent()
        store.current.turns.append(Turn(kind: .reader, text: "今天適合做什麼"))
        await store.runInCloud()
        precondition(store.error == nil, store.error ?? "")
        let tools = store.current.turns.filter { $0.kind == .tool }
        precondition(!tools.isEmpty && tools.allSatisfy { $0.ok }, "No real engine result")
        precondition(store.current.turns.last?.kind == .oracle && (store.current.turns.last?.text.count ?? 0) > 30,
            "No final reading")
        for turn in store.current.turns {
            print("\(turn.kind.rawValue): \(turn.text)")
            if let facts = turn.facts { print("engine facts: " + facts) }
        }
        print("PASS real iOS chat loop + relay + engines")
    }
}
'''
Path(sys.argv[1]).write_text(source + stubs)

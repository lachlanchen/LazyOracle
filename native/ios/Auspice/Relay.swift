import Foundation

/// Talking to the reading service, and letting it use the engines.
///
/// The service is our own relay, which holds the provider keys; the app never
/// carries one. The native app talks to the Huanayun mirror, which is the
/// faster of the two hosts from most networks here.
enum Relay {
    static let endpoints = ["https://oracle-fast.lazying.art/v1", "https://oracle.lazying.art/v1"]
    private static let session: URLSession = {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 20
        configuration.timeoutIntervalForResource = 45
        configuration.waitsForConnectivity = false
        return URLSession(configuration: configuration)
    }()

    // MARK: Wire format

    struct FunctionCall: Codable {
        var name: String?
        var arguments: String?
    }

    struct ToolCall: Codable, Identifiable {
        var index: Int?
        var id: String?
        var type: String?
        var function: FunctionCall?
    }

    struct Message: Codable {
        var role: String
        var content: String?
        var tool_calls: [ToolCall]?
        var tool_call_id: String?
        var name: String?

        init(role: String, content: String? = nil, tool_calls: [ToolCall]? = nil, tool_call_id: String? = nil, name: String? = nil) {
            self.role = role
            self.content = content
            self.tool_calls = tool_calls
            self.tool_call_id = tool_call_id
            self.name = name
        }
    }

    private struct Delta: Decodable {
        struct Choice: Decodable {
            struct Body: Decodable {
                let content: String?
                let tool_calls: [ToolCall]?
            }
            let delta: Body?
        }
        let choices: [Choice]?
    }

    struct Answer {
        var text = ""
        var toolCalls: [ToolCall] = []
    }

    enum Failure: LocalizedError {
        case http(Int, String)
        case offline
        case empty
        case interrupted

        var errorDescription: String? {
            switch self {
            case .empty: "The reading service sent no answer."
            case .interrupted: "The reading was interrupted. Please retry."
            case .offline: "The reading service could not be reached."
            case .http(let code, let body):
                code == 503
                    ? "The reading service has no model available just now."
                    : "The reading service answered \(code). \(body.prefix(140))"
            }
        }
    }

    /// One streamed completion. `onDelta` receives text as it arrives, so the
    /// reading appears a few words at a time rather than all at once.
    @MainActor
    static func stream(
        messages: [Message],
        tools: [[String: Any]],
        tier: String,
        onDelta: @escaping (String) -> Void
    ) async throws -> Answer {
        var lastError: Error = Failure.offline
        for endpoint in endpoints {
            var emitted = false
            do {
                return try await streamAt(endpoint, messages: messages, tools: tools, tier: tier) { piece in
                    emitted = true
                    onDelta(piece)
                }
            } catch {
                if Task.isCancelled { throw CancellationError() }
                lastError = error
                // Retry another relay only before visible output. A partial
                // answer must never be duplicated or silently replaced.
                if emitted { throw error }
                if case Failure.http(let code, _) = error, code == 400 || code == 413 || code == 429 { throw error }
            }
        }
        throw lastError
    }

    @MainActor private static func streamAt(
        _ endpoint: String, messages: [Message], tools: [[String: Any]], tier: String,
        onDelta: @escaping (String) -> Void
    ) async throws -> Answer {
        var request = URLRequest(url: URL(string: endpoint + "/chat/completions")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 20

        var body: [String: Any] = [
            "model": tier,
            "stream": true,
            "temperature": 0.3,
            "messages": messages.map(encode)
        ]
        if !tools.isEmpty {
            body["tools"] = tools
            body["tool_choice"] = "auto"
            body["parallel_tool_calls"] = false
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (stream, response) = try await session.bytes(for: request)
        guard let http = response as? HTTPURLResponse else { throw Failure.offline }
        guard http.statusCode == 200 else {
            var text = ""
            for try await line in stream.lines { text += line; if text.count > 400 { break } }
            throw Failure.http(http.statusCode, text)
        }

        var answer = Answer()
        var assembling: [Int: ToolCall] = [:]
        var finished = false
        for try await line in stream.lines {
            try Task.checkCancellation()
            guard line.hasPrefix("data:") else { continue }
            let payload = line.dropFirst(5).trimmingCharacters(in: .whitespaces)
            if payload == "[DONE]" { finished = true; break }
            if let data = payload.data(using: .utf8),
               let event = try? JSONSerialization.jsonObject(with: data) as? [String: Any], event["error"] != nil {
                throw Failure.interrupted
            }
            guard let data = payload.data(using: .utf8),
                  let chunk = try? JSONDecoder().decode(Delta.self, from: data),
                  let delta = chunk.choices?.first?.delta else { continue }
            if let piece = delta.content, !piece.isEmpty {
                answer.text += piece
                onDelta(piece)
            }
            // Tool calls arrive in fragments: the name in one chunk, the
            // arguments a few characters at a time in the ones after.
            for fragment in delta.tool_calls ?? [] {
                let index = fragment.index ?? 0
                var current = assembling[index] ?? ToolCall(index: index, id: nil, type: "function", function: FunctionCall(name: "", arguments: ""))
                if let id = fragment.id { current.id = id }
                if let name = fragment.function?.name, !name.isEmpty {
                    current.function?.name = name
                }
                if let arguments = fragment.function?.arguments {
                    let sofar = current.function?.arguments ?? ""
                    current.function?.arguments = sofar + arguments
                }
                assembling[index] = current
            }
        }
        answer.toolCalls = assembling.keys.sorted().compactMap { assembling[$0] }
        guard finished else { throw Failure.interrupted }
        if answer.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && answer.toolCalls.isEmpty { throw Failure.empty }
        return answer
    }

    private static func encode(_ message: Message) -> [String: Any] {
        var out: [String: Any] = ["role": message.role]
        out["content"] = message.content ?? ""
        if let calls = message.tool_calls, !calls.isEmpty {
            out["tool_calls"] = calls.map { call in
                [
                    "id": call.id ?? "call_0",
                    "type": "function",
                    "function": [
                        "name": call.function?.name ?? "",
                        "arguments": call.function?.arguments ?? "{}"
                    ]
                ] as [String: Any]
            }
        }
        if let id = message.tool_call_id { out["tool_call_id"] = id }
        if let name = message.name { out["name"] = name }
        return out
    }
}

/// The tools the conversation may use: each one runs a deterministic engine on
/// this device and hands back the computed facts. The model never invents a
/// card, a hexagram or a pillar — it asks for one and reads what it is given.
enum AgentTools {
    struct Outcome {
        let label: String
        let output: String
        let ok: Bool
    }

    static let maxSteps = 6

    /// Every tool, as a name and a sentence. The cloud reader turns these into
    /// JSON schemas; the on-device reader takes them as they are.
    static let descriptions: [(name: String, description: String)] = [
        ("draw_tarot", "Draw a tarot spread from a full shuffle and return the cards with their positions and keywords. Arguments: spread (one, three or celtic) and question."),
        ("cast_iching", "Cast a hexagram and return the lines, the primary and resulting hexagrams, and where the classical rule says to read. Arguments: method (coins or yarrow) and question."),
        ("four_pillars", "Compute the reader's BaZi chart from their saved birth details. No arguments."),
        ("natal_chart", "Compute the reader's natal chart and today's transits against it. No arguments."),
        ("eight_mansions", "Compute the reader's eight mansions: their gua, group and the quality of each direction. No arguments."),
        ("open_book", "Open a page of the Book of Answers or the Book of Questions. Arguments: book (answers or questions) and question."),
        ("birth_details", "Report the birth details saved on this device. No arguments."),
        ("almanac_day", "The almanac for a date: 宜, 忌, the day officer, the mansion, the spirits and the lucky hours, with a verdict for one undertaking if given. Arguments: date (ISO, defaults to today) and activity."),
        ("today", "Today's date, the lunar date, and the day's stem and branch. No arguments."),
        ("read_palm", "Read a hand: returns the measurements if one has been measured, otherwise opens the camera on the palmistry screen. No arguments."),
        ("read_face", "Read a face: returns the measurements if one has been measured, otherwise opens the camera on the face-reading screen. No arguments."),
    ]

    static func schemas() -> [[String: Any]] {
        func tool(_ name: String, _ description: String, _ properties: [String: Any] = [:]) -> [String: Any] {
            [
                "type": "function",
                "function": [
                    "name": name,
                    "description": description,
                    "parameters": ["type": "object", "properties": properties]
                ]
            ]
        }
        return [
            tool("draw_tarot", "Draw a tarot spread from a full shuffle and return the cards with their positions and keywords.", [
                "spread": ["type": "string", "enum": ["one", "three", "celtic"], "description": "One card, three, or the ten-card Celtic Cross."],
                "question": ["type": "string", "description": "The question the cards are drawn for."]
            ]),
            tool("cast_iching", "Cast a hexagram and return the lines, the primary and resulting hexagrams, and where the classical rule says to read.", [
                "method": ["type": "string", "enum": ["coins", "yarrow"], "description": "Three coins, or yarrow stalks."],
                "question": ["type": "string", "description": "The question the hexagram is cast for."]
            ]),
            tool("four_pillars", "Compute the reader's BaZi chart from their saved birth details."),
            tool("natal_chart", "Compute the reader's natal chart, and today's transits against it."),
            tool("eight_mansions", "Compute the reader's eight mansions: their gua, group and the quality of each direction."),
            tool("open_book", "Open a page of the Book of Answers or the Book of Questions.", [
                "book": ["type": "string", "enum": ["answers", "questions"], "description": "Which book to open."],
                "question": ["type": "string", "description": "What is being asked."]
            ]),
            tool("birth_details", "Report the birth details saved on this device, so you know whether a chart can be computed."),
            tool("almanac_day", "The almanac for a date: 宜, 忌, the day officer, the mansion, the spirits and the lucky hours, with a verdict for one undertaking if given.", [
                "date": ["type": "string", "description": "ISO date, e.g. 2026-09-23. Defaults to today."],
                "activity": ["type": "string", "description": "One of: marry, travel, move, business, contract, build, bed, ritual, medicine, study, meet, grooming."]
            ]),
            tool("today", "Today's date, the lunar date, and the day's stem and branch."),
            tool("read_palm", "Read a hand. If a hand has already been measured on the palmistry screen, this returns those measurements. If not, it opens the camera on that screen so the reader can present a palm — yours or the person sitting opposite — and you should then ask them to hold the palm up and tap Read this hand."),
            tool("read_face", "Read a face. If a face has already been measured on the face-reading screen, this returns those measurements. If not, it opens the camera on that screen and you should ask the reader to face it and tap Read this face.")
        ]
    }

    /// Runs one tool. A failure comes back as data, not as an exception: the
    /// model is told plainly that it could not have what it asked for.
    static func run(_ name: String, arguments: [String: Any]) -> Outcome {
        let profile = ProfileStore.shared.profile
        func engine(_ id: String, _ input: [String: Any], _ label: String) -> Outcome {
            do {
                let data = try Engines.shared.evaluate(id, input)
                return Outcome(label: label, output: String(data: data, encoding: .utf8) ?? "{}", ok: true)
            } catch {
                return Outcome(label: label, output: "{\"error\":\"\(error.localizedDescription)\"}", ok: false)
            }
        }
        func needProfile() -> Outcome {
            Outcome(
                label: "No birth details",
                output: "{\"error\":\"No birth details are saved. Ask the reader for the year, month, day, hour and birthplace, or tell them to fill in birth details on any chart screen.\"}",
                ok: false
            )
        }

        switch name {
        case "draw_tarot":
            let spread = arguments["spread"] as? String ?? "three"
            return engine("tarot.draw", ["spread": spread, "question": arguments["question"] as? String ?? ""], "Drew \(spread == "one" ? "one card" : spread == "celtic" ? "the Celtic cross" : "three cards")")
        case "cast_iching":
            let method = arguments["method"] as? String ?? "coins"
            return engine("iching.cast", ["method": method, "question": arguments["question"] as? String ?? ""], "Cast the lines with \(method == "yarrow" ? "yarrow" : "three coins")")
        case "four_pillars":
            guard profile.isComplete else { return needProfile() }
            return engine("bazi.chart", profile.engineInput, "Computed the four pillars")
        case "natal_chart":
            guard profile.isComplete else { return needProfile() }
            return engine("astrology.transits", ["birth": profile.engineInput], "Computed the natal chart and today's transits")
        case "eight_mansions":
            guard profile.isComplete else { return needProfile() }
            return engine("fengshui.mansions", [
                "year": profile.year, "month": profile.month, "day": profile.day, "gender": profile.gender
            ], "Computed the eight mansions")
        case "open_book":
            let book = arguments["book"] as? String ?? "answers"
            return engine("book.open", ["book": book, "question": arguments["question"] as? String ?? ""], "Opened the Book of \(book == "questions" ? "Questions" : "Answers")")
        case "birth_details":
            guard profile.isComplete else {
                return Outcome(label: "No birth details", output: "{\"saved\":false,\"note\":\"No birth details have been saved. Ask the reader; do not use form defaults as personal information.\"}", ok: true)
            }
            let data = try? JSONSerialization.data(withJSONObject: [
                "saved": profile.isComplete,
                "year": profile.year, "month": profile.month, "day": profile.day,
                "hour": profile.hour, "minute": profile.minute,
                "timeKnown": profile.timeKnown, "gender": profile.gender, "place": profile.place
            ])
            return Outcome(label: "Read the saved birth details", output: String(data: data ?? Data(), encoding: .utf8) ?? "{}", ok: true)
        case "almanac_day":
            var input: [String: Any] = [:]
            if let date = arguments["date"] as? String { input["date"] = date }
            if let activity = arguments["activity"] as? String { input["activity"] = activity }
            return engine("almanac.day", input, "Read the almanac")
        case "today":
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            return engine("almanac.day", ["date": formatter.string(from: Date())], "Checked today's date")
        case "read_palm":
            if let features = Router.shared.palm, let data = try? JSONEncoder().encode(features) {
                return Outcome(label: "Read the measured hand", output: String(data: data, encoding: .utf8) ?? "{}", ok: true)
            }
            Task { @MainActor in Router.shared.show(.palm) }
            return Outcome(
                label: "Opened the camera for a hand",
                output: "{\"opened\":\"palm\",\"note\":\"The camera is now open on the palmistry screen. No hand has been measured yet. Ask the reader to hold an open palm to the camera and tap 'Read this hand', then call read_palm again. They can switch to the back camera to read someone else's hand.\"}",
                ok: true
            )
        case "read_face":
            if let features = Router.shared.face, let data = try? JSONEncoder().encode(features) {
                return Outcome(label: "Read the measured face", output: String(data: data, encoding: .utf8) ?? "{}", ok: true)
            }
            Task { @MainActor in Router.shared.show(.face) }
            return Outcome(
                label: "Opened the camera for a face",
                output: "{\"opened\":\"face\",\"note\":\"The camera is now open on the face-reading screen. No face has been measured yet. Ask the reader to face the camera in even light and tap 'Read this face', then call read_face again. They can switch to the back camera to read someone else's face.\"}",
                ok: true
            )
        default:
            return Outcome(label: "Unknown tool", output: "{\"error\":\"no such tool: \(name)\"}", ok: false)
        }
    }
}

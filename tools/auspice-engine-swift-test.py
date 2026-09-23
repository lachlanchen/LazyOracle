#!/usr/bin/env python3
"""Generate a Darwin regression harness using the production Swift/JSCore bridge.

python3 tools/auspice-engine-swift-test.py /tmp/engine-regression.swift
On a Mac: swiftc -parse-as-library engine-regression.swift -o engine-regression
Then: ./engine-regression /absolute/path/to/lazyoracle-engines.js

The only source substitution is the resource URL, supplied as a CLI argument.
The real bridge and engine bundle are used; no engine results are mocked.
"""
from pathlib import Path
import sys
root = Path(__file__).resolve().parent.parent
source = (root/'native/ios/Auspice/Engines.swift').read_text().replace(
    'Bundle.main.url(forResource: "lazyoracle-engines", withExtension: "js")',
    'Optional(URL(fileURLWithPath: CommandLine.arguments[1]))')
tests = r'''
@main struct EngineRegression {
    struct Activity: Decodable { var id: String }
    struct Day: Decodable { var date: String; var yi: [String]; var ji: [String] }
    static func main() throws {
        let bridge = Engines.shared
        let directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
        // This first call aborts build 7 in NSJSONSerialization, just like the
        // first physical compass update in FengShuiScreen.
        for (index, expected) in directions.enumerated() {
            let direction = try bridge.evaluate("fengshui.sector", ["heading": index * 45], as: String.self)
            precondition(direction == expected)
        }
        print("PASS all eight compass sectors decode as scalar JSON strings")
        // Exercise normalization and repeated live heading updates.
        for heading in -720...720 {
            let normalized = (heading % 360 + 360) % 360
            let expected = directions[Int((Double(normalized) / 45).rounded()) % 8]
            let direction = try bridge.evaluate("fengshui.sector", ["heading": heading], as: String.self)
            precondition(direction == expected)
        }
        print("PASS 1,441 consecutive compass updates and heading normalization")
        let activities = try bridge.evaluate("almanac.activities", as: [Activity].self)
        precondition(activities.contains { $0.id == "travel" })
        print("PASS array engine result")
        let day = try bridge.evaluate("almanac.day", ["date": "2026-09-23"], as: Day.self)
        precondition(day.date == "2026-09-23" && day.yi.contains("祭祀") && day.ji.contains("出行"))
        print("PASS object engine result and exact 宜/忌 facts")
        do {
            _ = try bridge.evaluate("no-such-engine")
            preconditionFailure("Unknown engine should throw")
        } catch Engines.Failure.engineFailed { print("PASS engine error remains a Swift error") }
    }
}
'''
Path(sys.argv[1]).write_text(source + tests)

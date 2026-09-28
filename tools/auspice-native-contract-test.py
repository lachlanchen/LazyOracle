#!/usr/bin/env python3
"""Generate a Darwin harness exercising the production Swift models and engines."""
from pathlib import Path
import sys
root=Path(__file__).resolve().parent.parent
native=root/'native/ios/Auspice'
source=(native/'Engines.swift').read_text().replace('Bundle.main.url(forResource: "lazyoracle-engines", withExtension: "js")','Optional(URL(fileURLWithPath: CommandLine.arguments[1]))')
source+=(native/'Models.swift').read_text()
source+=(native/'VisionCapture.swift').read_text().split('func visionError')[0]
source+=(native/'Screens/Almanac.swift').read_text().split('/// Loads a day')[0].replace('import SwiftUI','')
source+=(native/'Profile.swift').read_text().split('@Observable')[0].replace('import SwiftUI','')
source+=(native/'Notebook.swift').read_text().split('func notebookName')[0]
source+=(native/'Screens/ChangeAtlas.swift').read_text().split('struct ChangeAtlasScreen')[0]
source+=r'''
@main struct ContractTest {
    static func main() throws {
        let engine = Engines.shared
        let temporary = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: temporary) }
        let notebookFile = temporary.appendingPathComponent("notebook.json")
        let notebook = NotebookStore(file: notebookFile)
        let atlas = try engine.evaluate("iching.explore", ["number":1,"changing":[1,2,3,4,5,6]], as: HexagramStudy.self)
        precondition(atlas.primary.number == 1 && atlas.resulting.number == 2)
        let atlasData = try JSONEncoder().encode(atlas)
        let atlasFacts = String(data: atlasData, encoding: .utf8)!
        precondition(notebook.save(practice: "atlas", facts: atlasFacts))
        precondition(notebook.save(practice: "atlas", facts: atlasFacts) && notebook.entries.count == 1)
        let reordered = try JSONSerialization.data(withJSONObject: JSONSerialization.jsonObject(with: atlasData), options: [.sortedKeys, .prettyPrinted])
        precondition(notebook.save(practice: "atlas", facts: String(data: reordered, encoding: .utf8)!) && notebook.entries.count == 1)
        let original = notebook.entries[0]
        var note = original
        note.reflection = "Reflection 思考"; note.action = "One small step"; note.observation = "Observed"; note.reviewed = true
        precondition(notebook.update(note))
        let restored = NotebookStore(file: notebookFile).entries[0]
        precondition(restored.facts == original.facts && restored.createdAt == original.createdAt)
        precondition(restored.reflection == note.reflection && restored.action == note.action && restored.observation == note.observation && restored.reviewed)
        let forged = NotebookEntry(id: original.id, practice: original.practice, createdAt: Date(), facts: original.facts, summary: NotebookSummary(question: "changed", lines: []), reflection: "Edited notes")
        precondition(notebook.update(forged))
        precondition(notebook.entries[0].summary.question == original.summary.question && notebook.entries[0].createdAt == original.createdAt)
        precondition(!notebook.save(practice: "unknown", facts: "{}") && notebook.entries.count == 1)
        for damaged in ["not json", "{\"version\":2,\"entries\":[]}"] {
            let broken = temporary.appendingPathComponent("broken.json")
            try damaged.write(to: broken, atomically: true, encoding: .utf8)
            let store = NotebookStore(file: broken)
            precondition(store.error != nil && !store.save(practice: "atlas", facts: atlasFacts))
            let preserved = try String(contentsOf: broken, encoding: .utf8)
            precondition(preserved == damaged)
        }
        print("PASS native Atlas decode; atomic notebook save/relaunch, canonical dedup, immutable facts, corrupt/future archive protection")
        let savedFace: [String: Any] = [
            "element":"mixed", "heightRatio":1.20, "jawRatio":0.80, "foreheadRatio":0.98,
            "eyesAcross":5.0, "eyeGap":1.0, "symmetry":0.99, "courts":[], "palaces":[], "strongPalaces":[],
            "measurement":["version":2, "samples":8, "typeCandidates":["fire","metal","water"], "limitations":["old"]]
        ]
        let oldData = try JSONSerialization.data(withJSONObject: savedFace)
        let old = try JSONDecoder().decode(FaceFeatures.self, from: oldData)
        precondition(old.classification == nil)
        let resolved = try engine.evaluate("face.resolve", ["features":savedFace], as: FaceFeatures.self)
        precondition(resolved.element == "water" && resolved.classification?.primary == "water")
        precondition(resolved.heightRatio == old.heightRatio && resolved.foreheadRatio == old.foreheadRatio)
        precondition(resolved.measurement?.typeCandidates == ["water"])
        let reloaded = try JSONDecoder().decode(FaceFeatures.self, from: JSONEncoder().encode(resolved))
        precondition(reloaded.classification?.theme == resolved.classification?.theme)
        precondition(reloaded.classification?.basis.foreheadRatio == 1.0)
        print("PASS saved mixed face migration, canonical primary and native persistence round trip")
        var seen = Set<String>()
        for spread in ["one", "three", "celtic"] {
            for seed in 0..<100 {
                let question = seed % 2 == 0 ? "" : "這筆生意可以談成嗎"
                let bytes = try engine.evaluate("tarot.draw", ["spread":spread,"seed":seed,"question":question])
                let draw = try JSONDecoder().decode(TarotDraw.self, from: bytes)
                precondition(draw.question == question)
                precondition(draw.cards.count == (spread == "one" ? 1 : spread == "three" ? 3 : 10))
                precondition(Set(draw.cards.map { $0.card.id }).count == draw.cards.count)
                seen.formUnion(draw.cards.map { $0.card.id })
            }
        }
        precondition(seen.count == 78)
        print("PASS all 78 tarot cards; 300 draws across all spreads with empty and Chinese questions")
        for method in ["coins", "yarrow"] {
            for seed in 0..<50 {
                _ = try engine.evaluate("iching.cast", ["method":method,"seed":seed], as:IChingCast.self)
            }
        }
        print("PASS 100 I Ching casts with production Swift models")
        for book in ["answers", "questions"] {
            _ = try engine.evaluate("book.open", ["book":book], as:BookOpening.self)
        }
        let birth = BirthProfile().engineInput
        _ = try engine.evaluate("bazi.chart", birth, as:BaziChart.self)
        _ = try engine.evaluate("astrology.chart", birth, as:NatalChart.self)
        _ = try engine.evaluate("astrology.transits", ["birth":birth], as:TransitReport.self)
        _ = try engine.evaluate("almanac.day", ["date":"2026-09-24","activity":"travel"], as:AlmanacDay.self)
        _ = try engine.evaluate("almanac.activities", as:[AlmanacActivity].self)
        _ = try engine.evaluate("fengshui.mansions", birth, as:EightMansions.self)
        print("PASS books, BaZi, astrology, almanac, Feng Shui native contracts")
    }
}
'''
Path(sys.argv[1]).write_text(source)

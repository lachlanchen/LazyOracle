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
source+=r'''
@main struct ContractTest {
    static func main() throws {
        let engine = Engines.shared
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

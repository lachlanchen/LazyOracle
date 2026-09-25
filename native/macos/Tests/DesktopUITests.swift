import XCTest
import AVFoundation

final class DesktopUITests: XCTestCase {
    func testNoCameraFallbackAndKeyboardSend() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-auspice.language", "en"]
        app.launch()
        defer { app.terminate() }
        if AVCaptureDevice.default(for: .video) == nil {
            for practice in ["face", "palm", "face", "palm"] {
                app.descendants(matching: .any)["desktop.\(practice)"].firstMatch.click()
                XCTAssertTrue(app.staticTexts["No camera is available on this device."].waitForExistence(timeout: 5))
                XCTAssertFalse(app.buttons["\(practice).measure"].isEnabled)
            }
            screenshot(app, "Mac no-camera fallback")
        }
        app.typeKey("n", modifierFlags: .command)
        let field = app.textFields["chat.question"]
        XCTAssertTrue(field.waitForExistence(timeout: 5))
        field.click(); field.typeText("A short greeting, please.")
        app.typeKey(XCUIKeyboardKey.return.rawValue, modifierFlags: .command)
        XCTAssertTrue(app.staticTexts["A short greeting, please."].waitForExistence(timeout: 10))
        expectation(for: NSPredicate { _, _ in app.buttons["chat.send"].label == "Send" && !app.buttons["chat.send"].isEnabled }, evaluatedWith: nil)
        waitForExpectations(timeout: 90)
        XCTAssertFalse(app.buttons["chat.retry"].exists)
    }

    func testReadingsPersistenceAndChat() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-auspice.language", "en"]
        app.launch()
        defer { app.terminate() }
        XCTAssertTrue(app.windows.firstMatch.waitForExistence(timeout: 20))
        app.descendants(matching: .any)["desktop.home"].firstMatch.click()
        screenshot(app, "Mac home")

        let tarot = app.descendants(matching: .any)["desktop.tarot"].firstMatch
        XCTAssertTrue(tarot.waitForExistence(timeout: 10)); tarot.click()
        let draw = app.buttons["tarot.compute"]
        XCTAssertTrue(draw.waitForExistence(timeout: 10)); draw.click()
        XCTAssertTrue(app.buttons["reading.explain"].waitForExistence(timeout: 10))
        XCTAssertTrue(draw.label.contains("again"))
        screenshot(app, "Mac tarot without question")

        app.descendants(matching: .any)["desktop.iching"].firstMatch.click()
        let question = app.textFields["iching.question"]
        XCTAssertTrue(question.waitForExistence(timeout: 5))
        question.click(); question.typeText("How can I approach today's work?")
        app.buttons["iching.compute"].click()
        XCTAssertTrue(app.buttons["reading.explain"].waitForExistence(timeout: 10))
        screenshot(app, "Mac I Ching")

        tarot.click()
        XCTAssertTrue(draw.waitForExistence(timeout: 5))
        XCTAssertTrue(draw.label.contains("again"), "The previous draw must survive navigation")
        app.terminate(); app.launch()
        tarot.click()
        XCTAssertTrue(draw.waitForExistence(timeout: 10))
        XCTAssertTrue(draw.label.contains("again"), "The previous draw must survive relaunch")

        // Command-N opens a new conversation using the shared store.
        app.typeKey("n", modifierFlags: .command)
        let chat = app.textFields["chat.question"]
        XCTAssertTrue(chat.waitForExistence(timeout: 10))
        chat.click(); chat.typeText("Please reply in English with a short greeting.")
        app.buttons["chat.send"].click()
        let answered = NSPredicate { _, _ in
            app.buttons["chat.send"].label == "Send" && !app.buttons["chat.send"].isEnabled
        }
        expectation(for: answered, evaluatedWith: nil)
        waitForExpectations(timeout: 90)
        XCTAssertFalse(app.buttons["chat.retry"].exists)
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "identifier == %@", "chat.answer")).count > 0)
        screenshot(app, "Mac live Tianji reply")

        for name in ["almanac", "bazi", "astrology", "fengshui", "answers"] {
            app.descendants(matching: .any)["desktop.\(name)"].firstMatch.click()
            XCTAssertTrue(app.windows.firstMatch.exists)
        }
        app.descendants(matching: .any)["desktop.home"].firstMatch.click()
        let home = app.textFields["home.question"]
        XCTAssertTrue(home.waitForExistence(timeout: 5))
        home.click(); home.typeText("Please give one short encouraging sentence in English.")
        app.buttons["home.send"].click()
        XCTAssertTrue(app.textFields["chat.question"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Please give one short encouraging sentence in English."].waitForExistence(timeout: 15))
        expectation(for: answered, evaluatedWith: nil)
        waitForExpectations(timeout: 90)
        XCTAssertFalse(app.buttons["chat.retry"].exists)
        screenshot(app, "Mac home question delivered")
        app.descendants(matching: .any)["desktop.settings"].firstMatch.click()
        XCTAssertTrue(app.buttons["简体中文"].waitForExistence(timeout: 5))
        app.buttons["简体中文"].click()
        app.descendants(matching: .any)["desktop.tarot"].firstMatch.click()
        XCTAssertTrue(app.buttons["tarot.compute"].waitForExistence(timeout: 5))
        screenshot(app, "Mac Chinese tarot")
    }

    private func screenshot(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.windows.firstMatch.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways
        add(attachment)
    }
}

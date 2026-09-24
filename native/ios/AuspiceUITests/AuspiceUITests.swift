import XCTest

final class AuspiceUITests: XCTestCase {
    let app = XCUIApplication()
    override func setUpWithError() throws { continueAfterFailure = false }
    override func tearDownWithError() throws { app.terminate() }

    private func launch(_ language: String = "en") {
        app.launchArguments = ["-auspice.language", language]
        app.launch()
        XCTAssertTrue(app.buttons["practice.tarot"].waitForExistence(timeout: 15))
    }
    private func open(_ practice: String) {
        let button = app.buttons["practice.\(practice)"]
        for _ in 0..<4 where !button.isHittable { app.swipeUp() }
        button.tap()
    }
    private func evidence(_ name: String) {
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = name; shot.lifetime = .keepAlways; add(shot)
    }

    func testTarotBlankThenChineseQuestion() {
        launch("zh-Hant"); open("tarot")
        let draw = app.buttons["tarot.compute"]
        draw.tap()
        XCTAssertFalse(app.staticTexts.containing(NSPredicate(format:"label CONTAINS 'tarot.draw:'")).firstMatch.exists)
        XCTAssertTrue(app.buttons["reading.explain"].waitForExistence(timeout: 8))
        app.swipeDown()
        let question = app.descendants(matching: .any).matching(identifier: "tarot.question").firstMatch
        question.tap(); question.typeText("這筆生意可以談成嗎")
        app.swipeUp()
        if !draw.isHittable { app.swipeDown() }
        draw.tap()
        XCTAssertTrue(app.buttons["reading.explain"].exists)
        evidence("tarot-traditional-blank-then-question")
    }

    func testEveryLanguageAndCameraNavigation() {
        for code in ["en","zh-Hans","zh-Hant","ja","ko","vi","es","fr","de","ru","ar"] {
            launch(code); open("tarot")
            XCTAssertTrue(app.buttons["tarot.compute"].exists)
            evidence("tarot-language-\(code)")
            app.terminate()
        }
        launch()
        for practice in ["face","palm","face","palm"] {
            open(practice)
            // Simulator camera absence must be a recoverable screen state.
            XCTAssertTrue(app.navigationBars.buttons.element(boundBy: 0).waitForExistence(timeout: 8))
            app.navigationBars.buttons.element(boundBy: 0).tap()
        }
        XCTAssertTrue(app.buttons["practice.tarot"].exists)
    }

    func testHomeQuestionContinuesExistingChatAndNewButton() {
        launch()
        let input = app.textFields["home.question"]
        input.tap(); input.typeText("Hello")
        app.buttons["home.send"].tap()
        XCTAssertTrue(app.staticTexts["Hello"].waitForExistence(timeout: 10))
        let send = app.buttons["chat.new"]
        XCTAssertTrue(send.waitForExistence(timeout: 10))
        XCTAssertFalse(send.label.isEmpty)
        XCTAssertGreaterThan(send.frame.width, 100)
        XCTAssertLessThan(send.frame.height, 80)
        let ready = NSPredicate(format:"enabled == true")
        expectation(for: ready, evaluatedWith: send)
        waitForExpectations(timeout: 90)
        app.navigationBars.buttons.element(boundBy: 0).tap()
        input.tap(); input.typeText("Please explain what you can do")
        app.buttons["home.send"].tap()
        XCTAssertTrue(app.staticTexts["Please explain what you can do"].waitForExistence(timeout: 15))
        expectation(for: ready, evaluatedWith: send)
        waitForExpectations(timeout: 45)
        evidence("home-message-delivered-to-existing-chat")
    }

    func testIChingBackendExplanationAndPracticeScreens() {
        launch(); open("iching")
        app.buttons["iching.compute"].tap()
        let explain = app.buttons["reading.explain"]
        for _ in 0..<4 where !explain.isHittable { app.swipeUp() }
        XCTAssertTrue(explain.waitForExistence(timeout: 10)); explain.tap()
        XCTAssertTrue(app.staticTexts["reading.answer"].waitForExistence(timeout: 90))
        evidence("iching-backend-explanation")
        app.navigationBars.buttons.element(boundBy: 0).tap()
        for practice in ["almanac","answers","bazi","astrology","fengshui"] {
            open(practice)
            if practice == "bazi" && app.buttons.containing(.staticText, identifier:"Add your birth details").firstMatch.exists {
                app.buttons.containing(.staticText, identifier:"Add your birth details").firstMatch.tap()
                app.textFields["birth.place"].tap(); app.textFields["birth.place"].typeText("Shanghai")
                app.swipeUp(); app.buttons["birth.save"].tap()
            }
            if practice == "answers" { app.buttons["Open the book"].tap() }
            if ["bazi", "astrology", "fengshui", "answers"].contains(practice) {
                XCTAssertTrue(app.buttons["reading.explain"].waitForExistence(timeout: 10))
            }
            evidence("practice-\(practice)")
            app.navigationBars.buttons.element(boundBy: 0).tap()
        }
    }
}

import XCTest

final class AuspiceUITests: XCTestCase {
    let app = XCUIApplication()
    override func setUpWithError() throws { continueAfterFailure = false }
    override func tearDownWithError() throws { app.terminate() }

    private func launch(_ language: String = "en") {
        app.launchArguments = ["-auspice.language", language]
        app.launch()
        let atlas = app.buttons["home.atlas"]
        XCTAssertTrue(atlas.waitForExistence(timeout: 20))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: atlas)
        waitForExpectations(timeout: 20)
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

    /// Store captures use the shipping UI, real calculations and notes entered
    /// through native controls. Run on a dedicated, empty store simulator.
    func testStoreStudyScreenshots() {
        for language in ["en", "zh-Hans"] {
            launch(language)
            evidence("store-01-home-" + language)
            app.buttons["home.atlas"].tap()
            app.descendants(matching: .any).matching(identifier: "atlas.choose").firstMatch.tap()
            app.buttons[language == "en" ? "1 · The Creative" : "1 · 乾"].tap()
            let reset = app.buttons["atlas.reset"]
            for _ in 0..<4 where !reset.isHittable { app.swipeUp() }
            reset.tap()
            for _ in 0..<3 where !app.buttons["atlas.line.6"].isHittable { app.swipeDown() }
            app.buttons["atlas.line.3"].tap()
            app.buttons["atlas.line.1"].tap()
            for _ in 0..<3 { app.swipeDown() }
            evidence("store-02-atlas-lines-" + language)
            app.swipeUp()
            evidence("store-03-atlas-figures-" + language)
            let save = app.buttons["notebook.save"]
            for _ in 0..<5 where !save.isHittable { app.swipeUp() }
            if save.isEnabled { save.tap() }
            XCTAssertFalse(save.isEnabled)
            app.navigationBars.buttons.element(boundBy: 0).tap()
            app.buttons["home.notebook"].tap()
            app.buttons["notebook.entry.atlas"].firstMatch.tap()
            let notes = language == "en" ? [
                "A change in approach can create space for a different result.",
                "Try a smaller first step and listen before deciding.",
                "The conversation was calmer when I left room for another view."
            ] : ["换一种做法，也许就能打开新的可能。", "先迈出一小步，听完对方的想法再决定。", "给不同意见留出空间后，沟通更平和了。"]
            for (key, text) in zip(["notebook.reflection", "notebook.action", "notebook.observation"], notes) {
                let field = app.descendants(matching: .any).matching(identifier: key).matching(NSPredicate(format: "elementType == %d OR elementType == %d", XCUIElement.ElementType.textField.rawValue, XCUIElement.ElementType.textView.rawValue)).firstMatch
                for _ in 0..<5 where !field.isHittable { app.swipeUp() }
                field.tap()
                let old = field.value as? String ?? ""
                if !old.isEmpty && old != field.placeholderValue {
                    field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: old.count))
                }
                field.typeText(text)
            }
            let saveNotes = app.buttons["notebook.saveNotes"]
            for _ in 0..<5 where !saveNotes.isHittable { app.swipeUp() }
            saveNotes.tap()
            for _ in 0..<5 { app.swipeDown() }
            evidence("store-04-notebook-original-" + language)
            app.swipeUp()
            evidence("store-05-notebook-reflection-" + language)
            app.terminate()
        }
    }

    func testAtlasAndNotebookWorkflow() {
        launch()
        evidence("study-home-en")
        app.buttons["home.atlas"].tap()
        let picker = app.descendants(matching: .any).matching(identifier: "atlas.choose").firstMatch
        XCTAssertTrue(picker.waitForExistence(timeout: 10)); picker.tap()
        app.buttons["1 · The Creative"].tap()
        let reset = app.buttons["atlas.reset"]
        for _ in 0..<4 where !reset.isHittable { app.swipeUp() }
        reset.tap()
        for _ in 0..<4 where !app.buttons["atlas.line.6"].isHittable { app.swipeDown() }
        for position in (1...6).reversed() {
            let line = app.buttons["atlas.line.\(position)"]
            for _ in 0..<3 where !line.isHittable { app.swipeUp() }
            line.tap()
        }
        for _ in 0..<4 where !app.staticTexts["2 · The Receptive"].isHittable { app.swipeUp() }
        XCTAssertTrue(app.staticTexts["2 · The Receptive"].exists)
        evidence("atlas-six-lines")
        let save = app.buttons["notebook.save"]
        for _ in 0..<5 where !save.isHittable { app.swipeUp() }
        if save.isEnabled { save.tap() }
        XCTAssertFalse(save.isEnabled)
        app.navigationBars.buttons.element(boundBy: 0).tap()
        app.buttons["home.notebook"].tap()
        let entry = app.buttons["notebook.entry.atlas"].firstMatch
        XCTAssertTrue(entry.waitForExistence(timeout: 8)); entry.tap()
        let reflection = app.descendants(matching: .any).matching(identifier: "notebook.reflection").matching(NSPredicate(format: "elementType == %d OR elementType == %d", XCUIElement.ElementType.textField.rawValue, XCUIElement.ElementType.textView.rawValue)).firstMatch
        for _ in 0..<4 where !reflection.isHittable { app.swipeUp() }
        reflection.tap(); reflection.typeText(" A small experiment")
        app.swipeUp()
        let saveNotes = app.buttons["notebook.saveNotes"]
        for _ in 0..<5 where !saveNotes.isHittable { app.swipeUp() }
        saveNotes.tap()
        XCTAssertEqual(saveNotes.label, "Notes saved")
        evidence("notebook-reflection")
        app.terminate(); launch()
        app.buttons["home.notebook"].tap(); app.buttons["notebook.entry.atlas"].firstMatch.tap()
        let restored = app.descendants(matching: .any).matching(identifier: "notebook.reflection").matching(NSPredicate(format: "elementType == %d OR elementType == %d", XCUIElement.ElementType.textField.rawValue, XCUIElement.ElementType.textView.rawValue)).firstMatch
        for _ in 0..<4 where !restored.isHittable { app.swipeUp() }
        XCTAssertTrue((restored.value as? String)?.contains("A small experiment") == true)
        XCTAssertTrue(app.staticTexts["notebook.original"].exists)
        evidence("notebook-restored")
    }

    func testStudyChineseAndArabic() {
        for language in ["zh-Hans", "ar"] {
            launch(language)
            evidence("study-home-" + language)
            app.buttons["home.atlas"].tap()
            XCTAssertTrue(app.buttons["atlas.line.6"].waitForExistence(timeout: 10))
            XCTAssertFalse(app.staticTexts["Change Atlas"].exists)
            evidence("study-atlas-" + language)
            app.navigationBars.buttons.element(boundBy: 0).tap()
            app.buttons["home.notebook"].tap()
            XCTAssertFalse(app.staticTexts["Reading notebook"].exists)
            evidence("study-notebook-" + language)
            app.terminate()
        }
    }

    func testCameraCaptureNeedsFreshFrames() {
        for language in ["en", "zh-Hans"] {
            launch(language)
            for practice in ["face", "palm"] {
                open(practice)
                let measure = app.buttons["\(practice).measure"]
                XCTAssertTrue(measure.waitForExistence(timeout: 10))
                XCTAssertFalse(measure.isEnabled)
                XCTAssertTrue(app.staticTexts[language == "en" ? "Hold steady for a moment before measuring." : "请保持不动片刻，再开始测量。"].exists)
                if practice == "palm" {
                    app.swipeUp()
                    XCTAssertTrue(app.buttons[language == "en" ? "Not sure" : "不确定"].firstMatch.exists)
                }
                evidence("capture-needs-frames-\(practice)-\(language)")
                app.navigationBars.buttons.element(boundBy: 0).tap()
            }
            app.terminate()
        }
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

    func testPinnedComposerAndSavedPractice() {
        launch(); open("tarot")
        app.buttons["tarot.compute"].tap()
        let explain = app.buttons["reading.explain"]
        XCTAssertTrue(explain.waitForExistence(timeout: 10))
        XCTAssertTrue(explain.isHittable)
        let footer = explain.frame
        app.swipeUp()
        XCTAssertEqual(explain.frame.minY, footer.minY, accuracy: 3)
        let input = app.textFields["reading.followup"]
        let multiline = app.textViews["reading.followup"]
        let question = input.exists ? input : multiline
        question.tap(); question.typeText("A saved follow-up")
        XCTAssertTrue(explain.isHittable)
        evidence("native-pinned-composer-keyboard")
        app.terminate(); launch(); open("tarot")
        XCTAssertTrue(explain.waitForExistence(timeout: 10))
        let restored = app.textFields["reading.followup"].exists ? app.textFields["reading.followup"] : app.textViews["reading.followup"]
        XCTAssertEqual(restored.value as? String, "A saved follow-up")
        evidence("native-restored-practice")
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

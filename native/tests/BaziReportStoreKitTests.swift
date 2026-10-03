import XCTest
import StoreKit
import StoreKitTest

/// Actual production client + Apple's local StoreKit transactions. Test-only
/// URLProtocol represents delivery; production server rejects Xcode receipts.
final class ReportFixtureTransport: URLProtocol {
    static var rows: [String: [String: Any]] = [:]
    static var offline = false
    static var verificationOffline = false
    static var receipts: [String] = []
    static let lock = NSLock()
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        Self.lock.lock(); defer { Self.lock.unlock() }
        var status = 200
        var reply: Any = [:]
        let action = request.url!.lastPathComponent
        if Self.offline { status = 503 }
        else if action == "catalog" { reply = ["apple": true] }
        else {
            var data = request.httpBody ?? Data()
            if let stream = request.httpBodyStream {
                stream.open(); defer { stream.close() }
                var buffer = [UInt8](repeating: 0, count: 4096)
                while stream.hasBytesAvailable { let n = stream.read(&buffer, maxLength: buffer.count); if n <= 0 { break }; data.append(contentsOf: buffer.prefix(n)) }
            }
            let body = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
            if action == "list" { reply = ["reports": Array(Self.rows.values)] }
            else if action == "create" {
                let template = try! Data(contentsOf: Bundle(for: BaziReportStoreKitTests.self).url(forResource: "ReportSnapshot", withExtension: "json")!)
                var row = try! JSONSerialization.jsonObject(with: template) as! [String: Any]
                row["id"] = body["id"]; row["question"] = body["question"]; row["language"] = body["language"]
                XCTAssertNil((body["profile"] as? [String: Any])?["name"])
                XCTAssertNil((body["profile"] as? [String: Any])?["place"])
                Self.rows[row["id"] as! String] = row; reply = row
            } else if action == "verify" {
                if Self.verificationOffline { status = 503 }
                else if let id = body["id"] as? String, var row = Self.rows[id], let signed = body["receipt"] as? String {
                    XCTAssertEqual(body["platform"] as? String, "apple")
                    XCTAssertEqual(signed.split(separator: ".").count, 3)
                    Self.receipts.append(signed)
                    row["status"] = "ready"
                    row["settled"] = true
                    row["report"] = Dictionary(uniqueKeysWithValues: ["overview", "balance", "work", "relationships", "cycles", "year", "practice"].map { ($0, String(repeating: "A saved test paragraph. ", count: 20)) })
                    Self.rows[id] = row; reply = row
                } else { status = 403 }
            } else if let id = body["id"] as? String, let row = Self.rows[id] { reply = row }
            else { status = 404 }
        }
        let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: ["Content-Type": "application/json"])!
        client!.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client!.urlProtocol(self, didLoad: try! JSONSerialization.data(withJSONObject: reply))
        client!.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}

final class BaziReportStoreKitTests: XCTestCase {
    @MainActor func run(_ test: (SKTestSession, DeepReports, URL, URLSession) async throws -> Void) async throws {
        let fixture = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "BaziReport", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: fixture)
        session.resetToDefaultState(); session.disableDialogs = true; session.clearTransactions()
        ReportFixtureTransport.rows = [:]; ReportFixtureTransport.receipts = []
        ReportFixtureTransport.offline = false; ReportFixtureTransport.verificationOffline = false
        let config = URLSessionConfiguration.ephemeral; config.protocolClasses = [ReportFixtureTransport.self]
        let transport = URLSession(configuration: config)
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let file = folder.appendingPathComponent("archive.json")
        let store = DeepReports(file: file, session: transport)
        defer { store.stop(); session.clearTransactions(); session.resetToDefaultState(); try? FileManager.default.removeItem(at: folder); transport.invalidateAndCancel() }
        await store.start()
        XCTAssertEqual(store.product?.price, Decimal(string: "4.99")); XCTAssertTrue(store.available)
        try await test(session, store, file, transport)
    }
    @MainActor func unfinished() async -> [StoreKit.Transaction] {
        var result: [StoreKit.Transaction] = []
        for await verification in StoreKit.Transaction.unfinished {
            if case .verified(let tx) = verification, tx.productID == DeepReports.productID { result.append(tx) }
        }
        return result
    }
    @MainActor func testPurchaseFinishesAfterDurableDeliveryAndReopensOffline() async throws {
        try await run { session, store, file, transport in
            let purchased = await store.purchase(profile: BirthProfile(), question: "Work")
            let id = try XCTUnwrap(purchased)
            XCTAssertEqual(store.reports.first?.id, id); XCTAssertEqual(store.reports.first?.status, "ready")
            XCTAssertFalse(ReportFixtureTransport.receipts.isEmpty)
            XCTAssertEqual(session.allTransactions().count, 1)
            let transactions = await self.unfinished(); XCTAssertTrue(transactions.isEmpty)
            ReportFixtureTransport.offline = true
            let reopened = DeepReports(file: file, session: transport)
            XCTAssertEqual(reopened.reports.first?.report, store.reports.first?.report)
            XCTAssertEqual(reopened.reports.first?.id, id)
            reopened.stop()
        }
    }
    @MainActor func testDeliveryFailureKeepsTransactionAndBlocksDuplicateChargeUntilRecovery() async throws {
        try await run { session, store, _, _ in
            ReportFixtureTransport.verificationOffline = true
            let purchased = await store.purchase(profile: BirthProfile(), question: "Relationships")
            let id = try XCTUnwrap(purchased)
            XCTAssertEqual(store.reports.first?.status, "unpaid")
            let unfinished = await self.unfinished(); XCTAssertEqual(unfinished.count, 1)
            XCTAssertEqual(unfinished.first?.appAccountToken?.uuidString.lowercased(), id)
            let again = await store.purchase(profile: BirthProfile(), question: "Try again")
            XCTAssertNil(again); XCTAssertEqual(session.allTransactions().count, 1)
            ReportFixtureTransport.verificationOffline = false
            await store.recover()
            XCTAssertEqual(store.reports.first?.status, "ready")
            let settled = await self.unfinished(); XCTAssertTrue(settled.isEmpty)
            XCTAssertEqual(session.allTransactions().count, 1)
        }
    }
    @MainActor func testAskToBuyStaysUnpaidUntilApproved() async throws {
        try await run { session, store, _, _ in
            session.askToBuyEnabled = true
            let purchased = await store.purchase(profile: BirthProfile(), question: "Cycles")
            let id = try XCTUnwrap(purchased)
            XCTAssertEqual(store.message, "report.pending"); XCTAssertEqual(store.reports.first?.status, "unpaid")
            XCTAssertTrue(ReportFixtureTransport.receipts.isEmpty)
            let tx = try XCTUnwrap(session.allTransactions().first)
            try session.approveAskToBuyTransaction(identifier: tx.identifier)
            for _ in 0..<40 {
                if store.reports.first(where: { $0.id == id })?.status == "ready" { break }
                try await Task.sleep(for: .milliseconds(100))
            }
            XCTAssertEqual(store.reports.first(where: { $0.id == id })?.status, "ready")
            XCTAssertEqual(session.allTransactions().count, 1)
        }
    }
}

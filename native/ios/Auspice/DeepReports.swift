import SwiftUI
import StoreKit

struct DeepReport: Codable, Identifiable {
    struct Facts: Codable { let chart: BaziChart; let timeKnown: Bool; let engineVersion: String }
    let id: String
    let created: Double
    let language: String
    let question: String
    var status: String
    let facts: Facts
    var report: [String: String]?
    var error: String?
    var settled: Bool?
    var checkoutSession: String?
}

/// Atomic local archive keeps recovery identifiers before opening StoreKit.
/// The server retains the verified grant independently of report generation.
@MainActor @Observable final class DeepReports {
    static let shared = DeepReports()
    static let productID = "art.lazying.lazyoracle.bazi.deep_report"
    private struct Archive: Codable { var capability: String; var reports: [DeepReport] }
    private let file: URL
    private let session: URLSession
    private var capability = ""
    private var listener: Task<Void, Never>?
    private(set) var reports: [DeepReport] = []
    private(set) var product: Product?
    private(set) var available = false
    private(set) var busy = false
    var message: String?

    init(file: URL? = nil, session: URLSession = .shared) {
        self.session = session
        self.file = file ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("bazi-reports-v1.json")
        if let data = try? Data(contentsOf: self.file), let archive = try? JSONDecoder().decode(Archive.self, from: data) {
            capability = archive.capability; reports = archive.reports
        } else if !FileManager.default.fileExists(atPath: self.file.path) {
            capability = (UUID().uuidString + UUID().uuidString).replacingOccurrences(of: "-", with: "")
            try? persist()
        } else { message = "report.storageError" }
    }

    private func persist() throws {
        guard !capability.isEmpty else { throw CocoaError(.fileReadCorruptFile) }
        try FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(Archive(capability: capability, reports: reports)).write(to: file, options: .atomic)
    }
    private func keep(_ report: DeepReport) throws {
        let previous = reports
        reports.removeAll { $0.id == report.id }; reports.insert(report, at: 0)
        do { try persist() } catch { reports = previous; throw error }
    }
    private func request<T: Decodable>(_ action: String, _ payload: [String: Any], as: T.Type = T.self) async throws -> T {
        try persist()
        var request = URLRequest(url: URL(string: "https://oracle.lazying.art/v1/reports/" + action)!)
        request.httpMethod = "POST"; request.timeoutInterval = 40
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer " + capability, forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, response) = try await session.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
        return try JSONDecoder().decode(T.self, from: data)
    }
    func start() async {
        if listener == nil {
            listener = Task { [weak self] in
                for await result in StoreKit.Transaction.updates { await self?.deliver(result) }
            }
        }
        await reloadProduct()
        await recover()
    }
    func stop() { listener?.cancel(); listener = nil }
    func reloadProduct() async {
        struct Catalog: Decodable { let apple: Bool }
        do {
            let (data, response) = try await session.data(from: URL(string: "https://oracle.lazying.art/v1/reports/catalog")!)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { return }
            available = try JSONDecoder().decode(Catalog.self, from: data).apple
            product = try await Product.products(for: [Self.productID]).first
        } catch { available = false }
    }
    func recover() async {
        for await result in StoreKit.Transaction.unfinished { await deliver(result) }
        struct List: Decodable { let reports: [DeepReport] }
        do {
            let saved: List = try await request("list", [:])
            for row in saved.reports { try keep(row) }
        } catch { /* Offline reports remain readable. Explicit retry shows errors. */ }
    }
    func purchase(profile: BirthProfile, question: String) async -> String? {
        guard !busy, available, let product else { message = "report.unavailable"; return nil }
        busy = true; message = nil
        defer { busy = false }
        do {
            for await pending in StoreKit.Transaction.unfinished {
                if case .verified(let transaction) = pending, transaction.productID == Self.productID {
                    await deliver(pending)
                    if message != nil { return nil }
                }
            }
            // Save the immutable order before the purchase sheet opens.
            let id = UUID().uuidString.lowercased()
            let row: DeepReport = try await request("create", ["id": id, "profile": profile.engineInput.filter { ["year", "month", "day", "hour", "minute", "gender", "longitude", "utcOffsetHours", "timeKnown"].contains($0.key) }, "language": Localisation.shared.code, "question": question])
            try keep(row)
            let result = try await product.purchase(options: [.appAccountToken(UUID(uuidString: row.id)!)])
            switch result {
            case .success(let verification): await deliver(verification)
            case .pending: message = "report.pending"
            case .userCancelled: message = nil; return nil
            @unknown default: message = "report.retryPurchase"
            }
            return row.id
        } catch { message = "report.retryPurchase"; return nil }
    }
    private func deliver(_ result: VerificationResult<StoreKit.Transaction>) async {
        guard case .verified(let transaction) = result, transaction.productID == Self.productID,
              let id = transaction.appAccountToken?.uuidString.lowercased() else { return }
        do {
            let row: DeepReport = try await request("verify", ["id": id, "platform": "apple", "receipt": result.jwsRepresentation])
            try keep(row)
            await transaction.finish()
            message = nil
        } catch { message = "report.retryPurchase" }
    }
    func refresh(_ id: String, retry: Bool = false) async {
        do {
            let row: DeepReport = try await request(retry ? "retry" : "get", ["id": id])
            try keep(row); message = nil
        } catch { message = "report.connectionError" }
    }
}

let deepReportSections = ["overview", "balance", "work", "relationships", "cycles", "year", "practice"]

struct DeepReportPanel: View {
    let profile: BirthProfile
    @State private var store = DeepReports.shared
    @State private var question = ""
    @State private var selected: String?
    var body: some View {
        Panel(title: t("report.title")) {
            Text(t("report.offer")).font(Typeface.serif(17)).foregroundStyle(Palette.inkSoft)
            Text(t("report.privacy")).font(Typeface.sans(13)).foregroundStyle(Palette.inkMute)
            TextField(t("report.question"), text: $question, axis: .vertical).textFieldStyle(.roundedBorder)
            Button {
                Task { selected = await store.purchase(profile: profile, question: String(question.prefix(1000))) }
            } label: {
                Label(store.busy ? t("report.processing") : lf(t("report.buy"), store.product?.displayPrice ?? "—"), systemImage: "doc.text.magnifyingglass")
                    .frame(maxWidth: .infinity, minHeight: 44)
            }.buttonStyle(PrimaryButtonStyle()).disabled(store.busy || !store.available || store.product == nil).accessibilityIdentifier("report.buy")
            if !store.available || store.product == nil {
                Text(t("report.unavailable")).font(Typeface.sans(13)).foregroundStyle(Palette.inkMute)
            }
            Button(t("report.recover")) { Task { await store.reloadProduct(); await store.recover() } }.buttonStyle(.bordered).accessibilityIdentifier("report.recover")
            if let message = store.message { Text(t(message)).foregroundStyle(Palette.gold) }
            ForEach(store.reports) { row in
                Button {
                    selected = row.id
                } label: {
                    HStack {
                        VStack(alignment: .leading) {
                            Text(Date(timeIntervalSince1970: row.created), style: .date)
                            Text(row.question.isEmpty ? t("report.title") : row.question).lineLimit(2)
                        }
                        Spacer()
                        Text(t("report.status." + row.status)).font(Typeface.sans(12))
                        Image(systemName: "chevron.right")
                    }.frame(minHeight: 44)
                }.buttonStyle(.plain).foregroundStyle(Palette.ink)
            }
        }
        .sheet(isPresented: Binding(get: { selected != nil }, set: { if !$0 { selected = nil } })) {
            if let id = selected { DeepReportView(id: id) }
        }
    }
}

struct DeepReportView: View {
    let id: String
    @State private var store = DeepReports.shared
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    if let row = store.reports.first(where: { $0.id == id }) {
                        let chart = row.facts.chart
                        Panel(title: t("report.original")) {
                            Text([chart.pillars.year.ganzhi, chart.pillars.month.ganzhi, chart.pillars.day.ganzhi, chart.pillars.hour.ganzhi].joined(separator: " · "))
                            Text(lf(t("bazi.quickSummary"), l(chart.dayMaster.stem), l(chart.dayMaster.element), t("bazi." + chart.strength), chart.favourable.map(l).joined(separator: " · ")))
                            if !row.facts.timeKnown { Text(t("birth.timeUnknown")) }
                        }
                        if let report = row.report {
                            ForEach(deepReportSections, id: \.self) { section in
                                Panel(title: t("report.section." + section)) {
                                    Text(report[section] ?? "").font(Typeface.serif(18)).textSelection(.enabled)
                                }
                            }
                            ShareLink(item: deepReportSections.map { t("report.section." + $0) + "\n" + (report[$0] ?? "") }.joined(separator: "\n\n")) { Label(t("notebook.export"), systemImage: "square.and.arrow.up") }
                        } else {
                            Text(t(row.error == nil ? "report.status." + row.status : "report.generationError"))
                            if row.status == "generating" { ProgressView().tint(Palette.gold) }
                            Button(t("report.retry")) { Task { await store.recover(); await store.refresh(id, retry: true) } }.buttonStyle(.bordered)
                        }
                        if let message = store.message { Text(t(message)) }
                    }
                }.padding(20)
            }.background(Palette.night).foregroundStyle(Palette.ink)
            .navigationTitle(t("report.title"))
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button(t("common.done")) { dismiss() } } }
        }
        .task {
            await store.refresh(id)
            while !Task.isCancelled {
                guard let row = store.reports.first(where: { $0.id == id }), row.status == "generating" || (row.status == "paid" && row.error == nil) else { break }
                try? await Task.sleep(for: .seconds(6))
                if Task.isCancelled { break }; await store.refresh(id)
            }
        }
    }
}

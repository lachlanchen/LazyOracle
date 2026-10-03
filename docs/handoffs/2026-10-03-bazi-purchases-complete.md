# BaZi report purchases and build 21

The owner-approved USD4.99 one-time report is implemented across native iOS, Android and PWA. The app price remains USD0.99 and the quick summary stays included. Each optional purchase freezes a deterministic chart, language and question; verified payment funds seven narrative sections. Generation failures can retry without another purchase. Local history supports offline reading and export.

Apple build21 and its first consumable were submitted together through App Store Connect on 2026-10-03 at10:05:27 UTC. Both are Waiting for Review; automatic release after approval remains configured. Build21 is available internally and passed public TestFlight review and is available to the public tester group. Build20 remains available for rollback; its pending formal submission was withdrawn only after qualified21 was ready.

Google build20 was already published. Build21 is available internally and submitted for production with the corrected data-safety form, native Atlas/notebook listing and optional-report description. Managed publishing is off, so approval releases automatically. Existing territories and Android7 fallback11 are retained. The per-report product is active. Only the exact owner-approved LazyOracle purchase API permissions were added to the existing service identity.

Both web hosts serve the report UI and primary verified delivery service. Stripe test checkout, webhook delivery, offline recovery and export were exercised. The mirror uses the primary ledger. No central account or Bunko changes are involved.

See [the curated release receipt](../../store/artifacts/bazi-report-purchases-2026-10-03.json) for hashes, submission IDs, qualification and limitations, and [the delivery contract](../billing/bazi-reports.md) for recovery semantics. Native local StoreKit tests used Apple's Xcode StoreKit environment and a test-only delivery transport; they do not prove a completed App Store or Google Play sandbox transaction. No live card was charged for qualification.

Report support accepts the store order reference and the report date/question, or UUID if available. Native report exports contain the seven narrated sections; the original chart remains in the native report reader. Web exports also include the chart and UUID filename. Retaining app/browser storage is necessary for anonymous purchase recovery; uninstalling or clearing it does not provide account-based restoration or cross-device sync.

Protected operator credentials, ledger paths, rollback commands, runtime evidence and owned-browser cleanup belong in `.runtime/billing/handoff.md`, outside Git. Historical release receipts are preserved.

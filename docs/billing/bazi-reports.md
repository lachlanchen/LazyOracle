# One-time detailed BaZi reports

Owner-approved offer: USD4.99 for one saved report, inside the existing USD0.99 app. The quick summary and ordinary Ask Tianji remain included. No subscription or sign-in dependency. Native purchases use StoreKit2 / Play Billing8.3. Web checkout uses Stripe; classic mobile wrappers suppress Stripe purchasing.

The offer appears after the deterministic chart. The report freezes its birth inputs, time-known flag, current-year chart, language and optional question. Names, birthplace labels, latitude and camera images are omitted. The backend recomputes using the shared TypeScript BaZi engine; client-submitted calculated facts never become authoritative. Seven sections cover overview, balance, work, relationships, cycles, year and practical reflection. Unknown-hour and simplified strength-method limitations remain explicit.

## Delivery and recovery

An atomic client archive retains a random installation capability and each UUID order before opening a store/payment sheet. The primary `oracle.lazying.art` report service owns the single SQLite ledger; mirrors never create independent purchase ledgers. Reports can be read and exported from BaZi history offline after delivery. Removing app/browser storage removes the local capability; this is not account-based cross-device sync or an account-level upgrade.

Apple's signed transaction is verified with Apple's official server library, trusted root certificates, online certificate checks, bundle/product/quantity checks, and a fresh App Store Server API transaction lookup. The transaction's appAccountToken must equal the frozen order. The app finishes only after the server grant and client archive are durable. Transaction updates/unfinished transactions recover delivery.

Google's productsv2 API must show PURCHASED, the exact product and quantity, and an obfuscated profile ID matching the order. Receipt hashes are unique in SQLite. The server commits the grant before consumption. Failed consumption leaves the token in the native archive for recovery; starting another purchase first retries unsettled transactions. Pending/cancelled/invalid purchases do not grant content.

Stripe checkout always uses the configured USD499-cent one-time Price and quantity1. Signed webhooks and return recovery both query Stripe independently, checking paid/completed status, order metadata/reference, price, currency and amount. Redirect parameters never grant content. An open Checkout session is reused; expired sessions get a new idempotent attempt. Checkout creation is serialized to prevent two payment sessions for one order.

Generation starts after verified payment and has at most three workers. A failed/incomplete response preserves a paid order; retries never request payment. Complete sections are saved atomically. Process restarts return interrupted jobs to paid/retry state. Each report is generated only once while a job is running. Provider and purchase secrets stay outside releases. Ordinary chat request content remains unretained; purchased-report records are stored for delivery/recovery as documented in the privacy policy.

## Operations

Production paths: `/v1/reports/{create,list,get,verify,checkout,retry}` (POST, installation Bearer capability); `/v1/reports/catalog` (GET); `/v1/reports/stripe-webhook` (POST, Stripe signature). Unknown methods/actions, wrong capabilities and wrong store bindings fail closed. Durable state belongs in `/var/lib/lazyoracle`, credentials in `/etc/lazyoracle/billing`, both protected for the service identity. The service explicitly sets `StateDirectoryMode=0700` and `UMask=0077`; the directory mode must survive systemd restarts.

Stripe qualification uses a separate ledger and test credentials at `/v1/reports-test/*`, additionally requiring a protected test key. Its signed webhook uses `/v1/reports/stripe-webhook-test`. Never route a test checkout into the production ledger or use a test transaction to claim live charged-payment qualification. Native local StoreKit tests use Apple's Xcode environment and a test-only transport; the production verifier rejects Xcode-signed receipts.

Build the backend engine with `node tools/build-report-engine.mjs`; its source imports `src/engines/bazi/bazi.ts`. `ops/requirements.txt` pins the Python verification runtime. `tools/deploy-web.sh` packages the engine and report modules into an immutable web release. Configure the protected environment and verification runtime before switching the report service unit. Retain the previous release/unit/env for rollback. Do not alter other apps, store products, publishing reviews, Caddy sites or tunnel ownership.

Validation: `python3 tools/report-service-test.py`, `python3 tools/oracle-gateway-test.py`, `npm run check`, native compilations and platform-specific billing tests. Release receipts must distinguish local StoreKit/Stripe test transactions, actual store sandbox transactions, live charged purchases, product review readiness and submission status. Do not infer store approval from a successful build.

# LazyOracle Pro: DeepSeek as the backend model

Status: plan, not started. Written 2026-09-22, after the owner asked for a Pro
version whose readings are written by DeepSeek.

## What the two products are

| | LazyOracle (shipping now) | LazyOracle Pro |
| --- | --- | --- |
| Price | USD 0.99, one purchase | USD 4.99, one purchase (same shape as L & N Pro) |
| Bundle / package | `art.lazying.lazyoracle` | `art.lazying.lazyoracle.pro` |
| Where the reading is written | On the device: a downloaded Tianji model, else the deterministic composition | Tianji Cloud by default, with the on-device models still available |
| Tiers offered | 天机快速版 / Tianji Fast, 天机专业版 / Tianji Pro, both on device | The same two names, served by DeepSeek V4.1 Flash and V4.1 Pro |
| Works with no network | Yes, completely | Yes, it falls back to the same local path |

The tier names do not change between the two apps. That is the point of naming
them 天机快速版 and 天机专业版 rather than after a vendor: the Pro app upgrades
what runs behind a tier, not what the reader has to learn.

Both apps keep the same deterministic engines. DeepSeek never computes a chart,
a hexagram or a pillar; it only narrates the structured facts the engines
produce, which is what keeps readings correct.

## Why a separate app rather than an in-app purchase

The owner already ships L & N and L & N Pro as two paid apps, so the store
listings, the review flow and the pricing are familiar. A separate app also
avoids the subscription and receipt-validation work that an in-app upgrade
would need on both stores, and it keeps the 0.99 app exactly as it is now while
its first review is running.

The cost is one more listing to maintain and a second binary to ship. The
codebase stays single: Pro is a build flag, not a fork.

## How Pro is built from the same repo

1. A build-time flag, `VITE_LAZYORACLE_EDITION=pro`, sets three things: the
   default of the Tianji Cloud switch (on), the app name shown in the shell,
   and the tier offered by default (Tianji Pro rather than Tianji Fast).
2. Capacitor gets a second configuration with the Pro bundle id and app name.
   Android already reads `versionCode` and signing from the release script, so
   Pro needs its own keystore entry and its own Play app.
3. Everything else, the engines, the visualisations, the corpora and the
   offline composition, is shared and unchanged.

## What has to happen on the server

The relay (`ops/oracle_gateway.py`, already deployed at `oracle.lazying.art/v1`)
is provider-agnostic and maps a tier to a provider model. Turning DeepSeek on is
filling in `/etc/lazyoracle/gateway.env`:

```
DEEPSEEK_API_KEY=<from platform.deepseek.com>
DEEPSEEK_MODEL_FAST=<the V4.1 Flash model id>
DEEPSEEK_MODEL_PRO=<the V4.1 Pro model id>
```

Three things still have to be built before Pro can ship:

- **Entitlement.** Today anyone who finds the URL can spend our tokens. Pro
  should mint a per-install token on first launch and send it as a bearer
  token, with the relay checking Play Integrity on Android and App Attest on
  iOS before minting. That is the elegant version. The cheap interim version is
  a per-install identifier plus a daily quota, which stops casual abuse but not
  a determined one.
- **Quotas.** Per install, something like 60 readings a day and 600 a month, is
  far above normal use and caps the worst case. The relay already limits by
  client address, which is not enough on carrier networks.
- **Spend ceiling.** A hard monthly ceiling in the relay that falls back to the
  on-device path once reached, so a runaway cost turns into a slower reading
  rather than a bill.

## Cost sketch

A reading sends roughly 700 to 1,200 tokens of structured facts and returns 400
to 900 tokens. At DeepSeek's usual pricing that is a small fraction of a cent
per reading, so a USD 4.99 purchase covers thousands of readings. The risk is
not the average user, it is an unauthenticated relay, which is why entitlement
comes before launch.

## Images stay off DeepSeek

DeepSeek's chat API takes text only. 手相 and 面相 can therefore never be sent
to it as photos. Palmistry keeps its present shape in both apps: MediaPipe Hand
Landmarker finds 21 points on the device, the engine derives the line and mount
features, and the model narrates those features as text. If face reading is
added later it follows the same shape with MediaPipe Face Landmarker. If a real
vision reading is ever wanted, it goes through the relay to a vision model on
the workstation (Qwen3-VL through LazyEdge), not to DeepSeek, and it must be an
explicit opt-in because it uploads a photo.

## Order of work

1. Wait for the current reviews to finish, so the 0.99 app is live and its
   behaviour is known.
2. Get the DeepSeek key and fill in the gateway environment file. Verify a
   streamed reading end to end against the existing app with the switch on.
3. Build entitlement, quotas and the spend ceiling in the relay.
4. Add the edition flag and the Pro Capacitor configuration; make the Pro build.
5. Create the Play and App Store records for Pro, reusing this app's listing
   text, screenshots and icon with a Pro badge.
6. Ship Pro to internal testing and TestFlight first, then production.

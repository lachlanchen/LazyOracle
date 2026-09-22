# LazyOracle Pro: DeepSeek as the backend model

Status: plan, not started. Written 2026-09-22, after the owner asked for a Pro
version whose readings are written by DeepSeek.

## What the two products are

| | LazyOracle (shipping now) | LazyOracle Pro |
| --- | --- | --- |
| Price | USD 0.99, one purchase, and no running cost to us | USD 4.99, one purchase (same shape as L & N Pro) |
| Bundle / package | `art.lazying.lazyoracle` | `art.lazying.lazyoracle.pro` |
| Where the reading is written | On the device: a downloaded Tianji model, else the deterministic composition | Tianji Cloud by default, with the on-device models still available |
| Tiers offered | 天机快速版 / Tianji Fast, 天机专业版 / Tianji Pro, both on device | The same two names, served by `deepseek-flash` (V4.1 Flash) and `deepseek-v4-pro` |
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
DEEPSEEK_MODEL_FAST=deepseek-flash
DEEPSEEK_MODEL_PRO=deepseek-v4-pro
DEEPSEEK_MODEL_VISION=deepseek-flash
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

A reading sends roughly 1,000 tokens of structured facts and returns about 700.
At DeepSeek's published prices that is:

| Tier | Model | Cost per reading, off-peak | Readings per USD 4.99 |
| --- | --- | --- | --- |
| Tianji Fast | `deepseek-flash` | about USD 0.0006 | roughly 8,000 |
| Tianji Pro | `deepseek-v4-pro` | about USD 0.002 | roughly 2,400 |

Peak hours cost twice that. A photo adds up to 1,024 tokens, so a palm reading
on Flash stays in the same range. Normal use is nowhere near these numbers, so
the margin is comfortable, and the real risk is an unauthenticated relay rather
than a heavy reader. That is why entitlement comes before launch, together with
the spend ceiling above.

## Photos: Flash can see, Pro cannot

`deepseek-flash` accepts images, up to 32 MiB each and about 1,024 tokens per
image; `deepseek-v4-pro` is text-only. The relay therefore routes any request
carrying an image to the vision model regardless of the tier asked for, which
is already implemented.

That makes a genuine cloud 手相 or 面相 reading possible in Pro: the photo goes
up with the structured landmark features, and the model reads both. The free
app already measures a face on the device with MediaPipe Face Landmarker, so
Pro adds the photo to a reading that is already correct rather than replacing
it. It must be
an explicit opt-in per reading, with plain wording that the photo leaves the
device, because everything else in these apps stays local. The free app keeps
the present shape: MediaPipe Hand Landmarker finds 21 points on the device, the
engine derives the line and mount features, and the model narrates only those
features. Face reading, when it is added, uses MediaPipe Face Landmarker the
same way, with the cloud photo path as the Pro upgrade. A workstation vision
model (Qwen3-VL through LazyEdge) remains the fallback provider.

## If the photo should stay on the device

There is a third option between landmarks and the cloud: a small vision model
downloaded like the Tianji models are. wllama already supports multimodal GGUF
files through an `mmprojUrl`, so no new runtime is needed.

| Model | Weights (Q8) | Projector (Q8) | Total download |
| --- | --- | --- | --- |
| SmolVLM 256M | 175 MB | 104 MB | about 280 MB |
| SmolVLM 500M | 437 MB | 109 MB | about 550 MB |
| Qwen2.5-VL 3B | 1.9 GB (Q4) | 845 MB | about 2.8 GB, too large for a phone |

Only the two SmolVLM sizes are realistic, and neither can be bundled inside the
app: Google Play's base delivery and Apple's cellular limits both push a
download that large out of the binary and into an on-demand download, which is
exactly how the Tianji models already work. Their reading quality on a palm
photo is also unproven and likely weaker than the cloud path.

So the order of preference is: landmarks plus narration on the device for
everyone, the cloud vision path as the Pro upgrade, and a downloadable vision
model only if buyers ask for a photo reading that never leaves the phone.

The free app must stay free to run. It ships with no API cost at all: the
engines are local, the narration is either a downloaded model or the offline
composition, and Tianji Cloud is off until the reader turns it on. That is
what keeps a USD 0.99 one-off price sustainable.

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

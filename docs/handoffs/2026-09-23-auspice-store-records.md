# Auspice: the store records, and how a build gets out

Written 2026-09-23, when the first internal builds went out on both stores.

Auspice is the native sibling of LazyOracle — a separate product with its own
name, its own identifier and its own store records, so nothing here disturbs a
LazyOracle review in flight.

## Identifiers

| | value |
| --- | --- |
| Bundle / application id | `art.lazying.auspice` |
| App Store app id | `6815034620` |
| App Store listing name | Auspice: Almanac Tarot BaZi |
| Play app id | `4973267996880132777` |
| Play listing name | Auspice |
| Apple bundle id record | `RLVUCZZBUM` |
| Provisioning profile | Auspice App Store (`6LBW32U6QT`) |
| Play internal track | `4701649823136226500` |
| Play opt-in link | https://play.google.com/apps/internaltest/4701649823136226500 |

The App Store name carries a qualifier because App Store names are unique
across the whole store and plain "Auspice" is already taken by someone else;
Play has no such rule, so it is "Auspice" there. The brand, the icon and the
home screen say Auspice either way. LazyOracle's listing has the same shape.

## Price

USD 0.99, and the store's equivalent everywhere else, as every LazyingArt app
is. On the App Store this is an `appPriceSchedules` record with `USA` as the
base territory, which Apple converts into 174 others. On Play the price was
set across 176 countries from a USD 0.99 base. Play was created **paid before
the first upload**, which is the one-way door: a published free app cannot
become paid.

## Making a build

**Android**, entirely on the workstation:

```bash
tools/auspice-android-build.sh release      # signed .aab, refuses if unsigned
```

Then Play Console → Auspice → Testing → Internal testing → Create new release.

**iOS**, on the Mac build host:

```bash
tools/auspice-sync.sh                       # rules in, project to the Mac
ssh echomind-kvm-macos '~/Projects/Auspice/build.sh 0.1.0 1'
```

`build.sh` unlocks the dedicated release keychain, archives with manual
signing against the Auspice App Store profile, and exports the IPA — no
interactive Xcode session, which is what "User interaction is not allowed"
means when it appears. Upload with `altool` and the App Store Connect API key
already on the Mac under `~/.config/echomind/apple`:

```bash
xcrun altool --upload-app --type ios --file .../Auspice.ipa \
  --apiKey 6SSXT8QU6W --apiIssuer 741adba6-ef89-4e36-8a69-ff43ebfa9ecc
```

`ITSAppUsesNonExemptEncryption` is `false` in `Info.plist`, so a build does not
sit waiting for an export-compliance answer the way LazyOracle's builds 2, 3
and 6 did.

## Two things the API cannot do

- **Create an app record.** `POST /v1/apps` answers 403: *the resource 'apps'
  does not allow 'CREATE'*. It has to be the web interface, which needs a
  signed-in session and the owner's two-factor code.
- **Create a Play app.** Same story; the console only.

Everything after that — bundle ids, certificates, provisioning profiles,
prices, builds, TestFlight groups — is API work and needs nobody.

## Why there is no downloaded model in Auspice

Tried and withdrawn on 2026-09-23, with the evidence kept because the next
person to have this idea deserves the numbers rather than the conclusion.

The plan was a local reader for phones Apple's system model will not run on —
an iPhone SE and anything of its age. llama.cpp was linked and embedded, two
GGUF models were offered (Gemma 3 1B at 769 MB, Qwen3 1.7B at 1081 MB), and the
work was split in two so that no part of it asked a small model to do something
it is bad at: name one computation from a list, then read the computed facts
back in words.

**The routing half worked perfectly.** A deterministic router keyed on the
words of the question — "palm"/"手相", "hexagram"/"卦", "desk"/"风水",
"today"/"今日" — reached 9 of 9 in under a second each, with no model call at
all. That part is worth keeping and is still in
`tools/auspice-small-model-test.mjs`.

**The narration half failed in the one way that disqualifies it.** Asked
今天适合搬家吗？ with the real almanac in front of it —

    engine's 宜: 祭祀 沐浴 修饰垣墙 平治道涂 馀事勿取
    engine's 忌: 嫁娶 入宅 安床 出行

the model wrote 今日宜嫁娶、入宅、安床、出行，忌祭祀、沐浴… — 宜 and 忌
inverted while looking straight at them — and then advised 读者可考虑搬家 on a
day the tables forbid moving house. Asked to open the Book of Answers it added
日主己土、六合丑未 to a page containing neither.

An app whose whole claim is that the engine decides cannot ship a reader that
reverses the engine. So the option was removed, llama.cpp unlinked, and
Automatic now goes to the relay, which is the only reader whose output has been
measured against the engines and found faithful.

Two lessons worth carrying:

- Instructions are not mechanisms. "Never invent" in a prompt did nothing for a
  1.7B model with no facts in hand; refusing to call the model at all when no
  tool has run is what actually prevents it.
- A reasoning model spends a short token budget entirely on thinking. The first
  run scored 0 of 8 for that reason alone, which looked like a design failure
  and was a configuration one. Both were real; only the second was fixable.

If this is revisited, the bar is a 4B-class model or better, and the test
harness above is how to decide rather than by reading the output once and
liking it.

## 2026-09-23 — Codex takeover, cloud-only reader

The owner subsequently deferred Apple's system model as well. Build 6
(0.1.0), delivery `63de329a-49ea-41a4-8e0b-5afdc07f9c53`, removes that
remaining reader choice. It is `VALID` and `IN_BETA_TESTING` in the manual
internal group `24b67fe2-ec14-40f3-a40c-04a2bb68a032`; upload alone would not
have added it. Android build 5 is signed and verified, with Play upload pending
browser access in the takeover session. No formal release was submitted.

The live privacy page now correctly mentions relevant conversation context
and birth details in cloud requests, instead of claiming conversations are
never uploaded. Camera images remain local. Full decisions and pending work:
[the takeover recap](2026-09-23-codex-takeover.md). Build hashes and precise
current state: `store/artifacts/takeover-2026-09-23.json`, `store/release.yaml`.

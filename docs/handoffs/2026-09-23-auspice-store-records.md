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

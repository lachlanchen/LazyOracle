# Needed from the owner: App Store Connect sign-in for the LazyOracle app record

Everything on Apple's side that the API can do is done: bundle id `art.lazying.lazyoracle` (VA743K7MV2), App Store provisioning profile "LazyOracle App Store 1", and a signed IPA (build 1, 1.0.0) on the Mac. `altool --validate-app` answers "Cannot determine the Apple ID from Bundle ID", because the **app record** does not exist and the App Store Connect API cannot create one.

Creating the record takes one signed-in browser session in the store stack (noVNC http://127.0.0.1:6165/vnc.html?host=127.0.0.1&port=6165&autoconnect=1&resize=scale): open https://appstoreconnect.apple.com, sign in with the account holder's Apple ID and relay the 2FA code; the session then creates the app (name "LazyOracle: Tarot, BaZi, I Ching", primary language English, bundle id art.lazying.lazyoracle, SKU lazyoracle-1), uploads build 1, fills the listing from `store/apple/metadata.md`, sets price tier 1, and submits.

Also needed: the DNS A record for **oracle.lazying.art** should point at **47.84.190.118** (the Aliyun host that already serves l-and-n.lazying.art, where the site and the APK are staged), or the Huanayun host must give the `lachlan` user passwordless sudo so Caddy can be configured there. The Huanayun host currently has no Caddy site and no sudo for this session.

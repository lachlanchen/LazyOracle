# Native apps: shared engines

The native iOS and Android apps draw their own screens, but they do not
re-implement the rules. `shared/lazyoracle-engines.js` is built from the same
TypeScript the web app runs, and exposes one function:

```js
LazyOracle.evaluateJson('{"engine":"almanac.day","input":{"date":"2026-09-23","activity":"marry"}}')
// {"ok":true,"version":1,"engine":"almanac.day","data":{ ... }}
```

Load it into JavaScriptCore on iOS or QuickJS on Android, call it, decode the
JSON. It has no DOM, no storage and no network: every engine is a pure
function, which is what makes a second implementation unnecessary and a second
set of bugs avoidable.

Rebuild it whenever an engine changes:

```bash
node tools/build-engine-bundle.mjs
```

`src/engine-bridge.test.ts` checks that the bridge returns exactly what the
app's own code returns for the same inputs, so the two can never drift.

Engines available: tarot draws and spreads, the I Ching cast and any hexagram
by number, BaZi charts, natal charts and transits, Eight Mansions and the
sector for a compass heading, palm and face features from landmarks, the
almanac for a date with its activity judgement, and the two books.

The plan for what to build natively, and in what order, is in
`../docs/plans/native-apps.md`.

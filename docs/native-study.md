# Change Atlas and reading notebook

Native LazyOracle's home leads with two offline workflows. They are implemented
in SwiftUI for iOS/macOS and Compose for Android. Classic Auspice keeps its
existing interface; it is not submitted as a second copy of this experience.

## Change Atlas

Choose a starting figure in King Wen order, then toggle lines numbered from the
bottom. Solid yang and broken yin lines appear before and after each change.
The resulting figure, upper/lower trigrams, concise meaning and classical Chinese
judgement are available without a random cast, birth profile or network.

Nuclear, opposite and inverse links apply to the starting figure, identified by
the panel heading. Following a link makes that figure the new starting point.
Reset clears the selected changes. Navigation and relaunch retain the selection.

`src/engines/iching/explore.ts` uses the existing I Ching catalogue and rules.
It validates the figure and line positions, normalizes repeated positions and
never reads a clock or random source. Tests enumerate all 4,096 figure/change
combinations, check involution and unchanged lines, and check independently known
figures. Both native apps call the same bundled engine.

## Notebook

An explicit save stores a complete computed result plus a readable excerpt.
The result is never recalculated while saving, editing or reopening an entry.
The same practice/result is deduplicated using a SHA-256 digest of canonical JSON.
Editing can change only the reflection, action, observation and reviewed flag;
the original facts, summary, practice and creation date remain fixed.

All nine practices can save results through their existing explanation area.
The Atlas can save deliberate experiments. The notebook provides a pending
filter and system text sharing. It is separate from chat history, practice state
and legacy import, and does not introduce an account or cloud sync.

Swift writes an atomic versioned JSON archive in Application Support; Android
uses AtomicFile in the app's files directory. A damaged or newer unsupported
archive produces a visible error and cannot be overwritten by a new save.
Notes are saved with the explicit Save notes button. Unsaved edits are not
promised to survive leaving the entry. No generated narration is treated as the
original calculation.

## Validation

- Shared suite: 144 tests, including exhaustive Atlas construction, notebook
  summaries for all practices, existing charts, vision rules and chat recovery.
- Lint, TypeScript and production PWA build pass. The classic UI is unchanged.
- Ten Android unit tests pass. Offline emulator UI checks pass for construction,
  exact snapshot, editing, duplicate prevention and force-stop/relaunch.
- Android damaged-archive injection rejects a save without changing the file;
  the original test archive was restored and verified afterwards.
- The production Swift storage/engine harness passes atomic save/reload,
  canonical deduplication, immutable fields and damaged/future-version protection.
  Existing contracts still pass for 300 tarot draws covering all 78 cards,
  100 I Ching casts and the other chart engines.
- iPhone workflow and Chinese/Arabic navigation have passed. Current iPad and
  release verification is recorded in the dated release receipt/handoff.
- macOS builds pass on the Intel KVM Mac and the Apple Silicon Mac mini. The
  mini uses its installed Xcode 27; existing iOS signing remains on the qualified
  Xcode 26.3 host. No signing credentials were copied to the mini.

Evidence and raw store responses remain under `.runtime/2026-09-29-distinctive/`.
These tests do not imply a new physical-camera validation or App Store approval.
The [review draft](../store/apple/native-study-review.md) describes the concrete
workflow and the rejected classic build, without claiming universal uniqueness.

# Agent notes for LazyOracle

Read `docs/brief.md` first: it is the product and architecture contract agreed with the owner on 2026-09-21.

- Owner: Lachlan (Rongzhou Chen), LazyingArt LLC. Publishing accounts, store stack, Mac build host and API keys are the same as for `../L-And-N`; that repo's `store/operator-handoff.md`, its private `.runtime/store/handoff.md`, and `../Company` hold the procedures. Reuse them; do not re-derive.
- Secrets never enter this repo. They live under `~/.config/<service>/` (mode 600). Tracked docs carry curated facts only.
- Two sessions collaborate on this project: the LazyOracle session (this folder, product code, models, data) and the L & N session (store publishing partner). Split by ownership, exchange through files and commits, rebase before committing, never reset the other's work.
- Every generated artefact (chart, hexagram, tarot draw) must come from a deterministic engine with tests; the language model only narrates from structured input. Model output that contradicts the engine is a bug.
- The workstation has two RTX 4090 D (24 GB each); `../LocalLLM` serves models locally and `../LazyEdge` exposes them to phones through a reviewed reverse tunnel.

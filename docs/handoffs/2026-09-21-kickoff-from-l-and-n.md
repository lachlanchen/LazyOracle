# Kickoff note from the L & N session, 2026-09-21

You are a fork of the L & N session, so you already carry the publishing experience: the CDP/noVNC store stack (display :165, CDP 9485, noVNC http://127.0.0.1:6165/vnc.html?host=127.0.0.1&port=6165&autoconnect=1&resize=scale), the App Store Connect API helper (`scratchpad/asc.py` pattern, key path in the private handoff), the Mac build host `echomind-kvm-macos` with `release/buildN.sh` / `uploadN.sh`, the Play Console helpers (`pro.py`/`pro3.py`/`play_internal.py`), the Google merchant setup and the "publish paid from day one" lesson.

Your folder is `/home/lachlan/ProjectsLFS/LazyOracle` (GitHub: lachlanchen/LazyOracle, public). Work there; commit and push as you go. Read `docs/brief.md` and `AGENTS.md` first.

The L & N session keeps `/home/lachlan/ProjectsLFS/L-And-N` and remains available as the publishing partner: when the free app's Play release 11 and the Pro first review finish it will promote release 13, and it can take store actions for LazyOracle if you leave a request file here. Do not edit files under L-And-N.

Downloads are already running (`models/download.log`, `models/download.sh`). Start with milestone 1 in the brief (scaffold from the L & N shell, theme, Tarot end to end on the PWA) and show screenshots early; the owner cares most that it is beautiful and simple.

## Update 18:40 — domain and edge

- The owner pointed **oracle.lazying.art** at 179.236.105.35, the Huanayun host that runs the LazyTunnel/LazyEdge public edge (`lazy-fleet-hop` in `~/.config/lazytunnel-fleet/ssh_config`, SSH port 2222). Use it as the LazyEdge route for the workstation LocalLLM fallback and, if convenient, to host the PWA under the same name. Nothing is configured on it yet for LazyOracle.
- L & N's web host is a different machine (Aliyun `sshem-admin`, 47.84.190.118) with the immutable-release layout in `../L-And-N/tools/deploy-web.sh`; either host can serve the PWA, pick one and record it in `store/`.
- `../LazyEdge` branch `integration/echomind-image-transport-20260911` was pushed to GitHub on 2026-09-21 at the owner's request.

# Tianji Cloud: where readings are written, and the decision still open

Written 2026-09-22 by the LazyOracle session.

## What is running

`ops/oracle_gateway.py` runs on the Aliyun host as `oracle-gateway.service`,
listening on 127.0.0.1:18963, reached publicly as `https://oracle.lazying.art/v1`.
It holds the provider credentials so the app never does, streams the answer
back, and keeps no content. Its configuration is `/etc/lazyoracle/gateway.env`
(root:lazyoracle-web, mode 640).

Providers are tried in order. DeepSeek is first but unset. The LazyEdge entry
is set and is what answers today:

| Setting | Value |
| --- | --- |
| `LAZYEDGE_URL` | `http://127.0.0.1:18080/v1/chat/completions`, the LazyEdge compatibility listener already present on that host |
| `LAZYEDGE_TOKEN` | the `llm.lazying.art` client token, read from `~/.config/lazyedge/secrets/llm-lazying-art-client-token` on the workstation and written straight into the env file |
| `LAZYEDGE_MODEL_FAST` | `qwen3:4b-q4_K_M` |
| `LAZYEDGE_MODEL_PRO` | `qwen3:30b-a3b-instruct-2507-q4_K_M` |
| `LAZYEDGE_MODEL_VISION` | `qwen3-vl:8b-instruct-q4_K_M` |

Measured through the public endpoint: 5.7 s for an ordinary reading, 64 s for
the larger tier while its weights load, 3.1 s once warm.

## The weakness

Readings stop when the workstation sleeps or the tunnel drops. The app then
falls back to its offline composition, so nothing breaks visibly, but the
narration is plainer. The route also allows two concurrent requests and is
shared with EchoMind, which confirmed on 2026-09-22 that it does not use it.

## The open decision, for the owner

EchoMind already reaches the DeepSeek API from the same host through its
enhancement and agent pipelines, so a DeepSeek credential exists there. Two
options, and it is the owner's call because it bills their account:

1. Share that credential with LazyOracle. Fill `DEEPSEEK_API_KEY` in
   `/etc/lazyoracle/gateway.env` and restart the service; the relay prefers
   DeepSeek automatically and the workstation becomes the fallback. Cost is
   roughly USD 0.0006 a reading on Flash.
2. Issue a separate key for LazyOracle, which keeps the two apps' spending
   apart and is the cleaner arrangement if readings ever grow.

Nothing here reads or reuses another app's credential without that decision.

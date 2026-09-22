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

The EchoMind session confirmed on the same day where its key lives, without
reading it: `/etc/echomind/echomind-web.env` on the Aliyun host, root-owned
and readable only by that service account, consumed through one shared client
factory so a single key serves enhancements, the assistant and the agent.

Its recommendation, which this session agrees with, is the second option.
Sharing one key means the two apps share a rate limit and a spend line, and a
burst of readings would compete with chat, where latency is visible to the
person typing. Separate keys under the same DeepSeek account give per-app
usage figures and an independent limit for a few minutes of setup. If the
owner chooses to share after all, EchoMind asked to be told before it goes
live so it can watch its provider error rate for a day.

Nothing here reads or reuses another app's credential without that decision.

## The Huanayun mirror, and why Let's Encrypt was never blocked

Checked again on 2026-09-23 after the L & N session relayed a Codex note
(`~/Nutstore Files/Share/LazyEdit/ORACLE-FAST-HUANAYUN-CLAUDE-HANDOFF.md`).

Huanayun does not filter Let's Encrypt. The earlier certificate failures on
that host had a mundane cause: `nftables` PREROUTING redirects public 80 to
18080 and public 443 to 18443, and those high ports belong to
`lazystudio-caddy.service`, which reads `/etc/lazystudio/Caddyfile` and takes
its reload through the admin endpoint on `127.0.0.1:12019`. Anything that binds
80 or 443 itself — a second Caddy, or `certbot --standalone` — holds a socket
that inbound validation never reaches, which looks exactly like a provider
block and is not. The owner's instruction is the short form of this: do not use
80 and 443 directly on that host.

The mirror is already live and correct. `oracle-fast.lazying.art` resolves to
179.236.105.35, holds its own Let's Encrypt certificate (issued 21 September,
valid to 20 December, renewed by this same Caddy), and serves the release from
`/srv/lazyoracle/current/dist` — the same `index-DHXRbLUZ.js` as Aliyun and as
the local build. `tools/deploy-web-fast.sh` publishes to it. So no move was
forced and none is needed: `oracle.lazying.art` stays on Aliyun with the relay,
and Huanayun carries the app and the model downloads.

One gap was closed today. The mirror's SPA fallback answered `POST /v1/...`
with the app shell and a 200, so a relay call sent to the wrong host would fail
as a JSON parse error rather than as a request failure. The site block now has
a `handle /v1/*` above the fallback that returns a 404 with a JSON body naming
the real endpoint. The change is additive, was validated with `caddy validate`
before installation, was reloaded through 127.0.0.1:12019, and left
`edit.lazying.art`, `agent.lightmind.art` and `oracle.lazying.art` answering
exactly as before. The previous file is kept beside it as
`/etc/lazystudio/Caddyfile.bak-20260922T162137Z` for a one-command rollback.

The relay itself still runs only on Aliyun. Moving it to Huanayun, which the
owner suspects is faster, waits on the key decision above: it would need its
own `/etc/lazyoracle/gateway.env` on that host, and that is the moment to use a
LazyOracle key rather than EchoMind's.

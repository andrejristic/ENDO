# Phase 4 — Theia migration & running third-party extensions (plan, not yet built)

Honest status: this is the ONE phase not delivered as working code. It is a
re-platforming effort that cannot be responsibly finished without a live build
environment. Everything else (the PSE brain, the agent loop, the Guardian scanner,
Open VSX browse/scan, llama.cpp, memory, swarm/Physician) works in Phase 0–3.

## Why it's separate
Phase 0 runs on Electron + Monaco. That gives a real editor and reliably packages to
`.deb`, but it does NOT include a VSCode **extension host** — the component that
actually *executes* third-party extensions. Building/embedding an extension host is a
large, standalone effort; the honest move was to ship the scanner + browse now and
keep execution as a documented next track.

## Two migration options
1. **Move the shell to Eclipse Theia** (the original locked decision). Theia ships a
   VSCode extension host (`@theia/plugin-ext-vscode`) and Open VSX integration
   (`@theia/vsx-registry`) out of the box. The PSE layer (`src/core/`) is
   shell-independent and drops in as a Theia extension almost unchanged. This is the
   recommended path.
2. **Embed a standalone extension host** into the current Electron app. More control,
   much more work; not recommended over (1).

## What carries over unchanged
`src/core/*` — theta, gate, Seldon, attractors, channel-guard, Guardian scanner,
egress monitor, memory, swarm/Physician, model layer. The agent loop (`agent.ts`) is
UI-agnostic. Only the shell (main + renderer) is replaced by Theia contributions.

## Concrete steps (when we build it)
1. Scaffold a Theia app (browser + electron packages, `@theia/core`, `@theia/editor`,
   `@theia/terminal`, `@theia/vsx-registry`, `@theia/plugin-ext-vscode`).
2. Wrap `src/core` as a Theia extension; port the PSE panels (chat/theta/memory/scan)
   to Theia widgets.
3. Route Open VSX install through the Guardian scanner BEFORE the extension host loads
   the plugin (gate on CRITICAL).
4. Wire **Guardian Tier 2**: instrument the plugin-host Node runtime (hook
   `http/https/net/dns`) and feed `EgressMonitor` real connections; optional eBPF
   deep-mode on Linux.
5. Provenance badges on any output produced by a third-party extension.

## Deferred within Phase 4
- eBPF OS-level egress capture (needs root/native module) — optional deep-mode.

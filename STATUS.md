# PSE IDE — STATUS (honest)

## Phases at a glance
- **Phase 0** ✅ shell, editor/tabs/terminal, model layer, Guardian scanner, Open VSX browse, i18n, dark, `.deb`. (GUI runs on user's machine.)
- **Phase 1** ✅ agentic loop (`agent.ts`): tool execution (read/edit/create/delete/run/search) → necessity→theta → live consequence gate (approval cards) → Seldon updates → channel-guard → absorption proposals.
- **Phase 2** ✅ llama.cpp lifecycle: start/stop/status `llama-server` from a chosen `.gguf` (settings picker).
- **Phase 3** ✅ project-memory panel: pending vs confirmed organelles, Da/Ne confirm, delete, export to a repo (`.pse-memory.json`).
- **Phase 4** ⏳ Theia + RUNNING third-party extensions — NOT built (re-platforming). Plan in `docs/PHASE4_THEIA.md`. Scanner + browse work now; execution deferred.
- **Phase 5** ✅ egress-monitor core (`egressMonitor.ts`): promised-vs-actual + low-and-slow detection (verified). Live network capture waits on Phase 4's extension host; eBPF deep-mode deferred.
- **Phase 6** ✅ swarm + Physician (`swarm.ts`, `physician.ts`): boundary-reset dispatch on drift, fission/fusion signals, multi-agent theta panel.
- **Phase 7** ✅ polish: open-folder button, dirty-tab dots, file search, model field, app icon, AppImage target, minified `dist:free` build for the giveaway.

Verified by the logic mirror + on-device `selfcheck`: 16 checks incl. theta, Seldon,
scanner (CRITICAL on a keylogging theme), gate, memory, channel-guard, egress
(unpromised host + low-and-slow), physician reset. → `ALL PASS`.

---

## Original Phase-0 note
Written in one pass. The PSE brain was **verified by a logic mirror**; the
Electron shell is standard but was **not run in the authoring sandbox** (no Node there
— you build it on your machine). Here is exactly what is what.

## Verified (logic proven with a no-network mirror test)
- **theta**: necessary work pulls theta toward 15; idle relaxes toward 30. ✔
- **Seldon**: cheap-claims + low-verify → `principal_agent`/`signalling`; raises the
  verification bar. ✔
- **Guardian scanner**: a Theme that reads keystrokes and posts to an unknown domain →
  discloses Sentry, flags the unknown egress, rates **CRITICAL**. ✔ (a scoring bug that
  first rated it BENIGN was found and fixed by this test)
- **gate**: `git_push` always asks; `git_commit` opens only after trust is earned. ✔
- **memory**: an organelle is not constitutive until human-confirmed. ✔
- **channel-guard**: injection is detected; a tangent surfaces a question. ✔

Reproduce on your machine: `npm run build:core && npm run selfcheck` → `ALL PASS`.

## Fully implemented (standard code; compiles/runs on build)
- Electron main: window (dark), native menu (terminal button, SR/EN, extensions),
  keychain (keytar), integrated terminal (node-pty), filesystem IPC.
- `.vsix` unzip + scan; Open VSX search + download + scan-on-install.
- Renderer: Monaco editor, tabs, terminal panel, PSE chat with **provenance badges**,
  theta panel with per-agent icons → theta/time graph (green/red + suggestion), scan
  modal with "Install anyway", settings (keys per profile, provider override), SR/EN,
  dark-only theme.
- Model layer: router (online→API / offline→GGUF, overridable), adapters for
  Anthropic / Mistral / Groq / llama.cpp, native + fallback tool-calling, theta→style.

## Phase 1 (documented, not in this build)
- **Running third-party VSCode extensions** (the execution host). Phase 0 does the
  Guardian scan + Open VSX browse; execution needs the Theia/Code plugin host.
- **Guardian Tier 2** runtime egress monitor (Node-runtime instrumentation of the
  extension host; optional eBPF deep-mode on Linux).
- Migration of this shell onto **Eclipse Theia** for free VSCode-extension support.

## Known build caveats
- `node-pty` and `keytar` are native modules → need `build-essential python3
  libsecret-1-dev` and possibly `npx electron-rebuild` (see BUILD.md).
- Monaco workers are emitted as sibling files by `scripts/build-renderer.mjs`; CSP
  already allows `worker-src 'self' blob:`.
- No app icon is set (electron-builder default); add `assets/icon.png` to brand it.

## Answered design questions → where they live
Q1 router.ts · Q2 model/toolcall.ts · Q4 model/style.ts · Q6 keychain.ts+router.ts ·
Q7 necessity.ts · Q8/Q9 theta.ts · Q10–12 gate.ts · Q13–15 channelGuard.ts ·
Q16 renderer scan modal · Q18/19 memory.ts · Q20 terminal panel · Q21 theta panel ·
Q22 provenance badges · Q23 name "PSE IDE" (working) · Q25 see LICENSE.

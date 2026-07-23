# PSE IDE

A boundaried, PSE-governed coding IDE with a Guardian that tells you **who can
watch/listen to you before you install anything**.

Built by Andrej Ristic / ZeravaTech Inc. on the PSE (Partial Self-Extension) kernel.
The design lives in the sibling `.txt` files (`../PSE_MASTER_ARCHITECTURE.txt` and the
`PSE_IDE_*.txt` companions); this folder is the implementation.

## Quick start

```bash
npm install
npm run selfcheck   # verify the PSE brain (no network)
npm run start       # launch from source
npm run dist        # build the .deb  -> release/
```

See **BUILD.md** for prerequisites and the `.deb` steps, **STATUS.md** for what is
implemented vs Phase 1, and **docs/GUIDE.sr.md** / **docs/GUIDE.en.md** for the user
guide.

## Layout

```
src/core/      the PSE brain — shell-independent, dependency-free, verifiable
  theta.ts             theta monitor (two-axis model)
  necessity.ts gate.ts action grammar + human gate + Trust game
  seldon.ts attractors.ts channelGuard.ts   games, attractors, I/O guard
  guardianScanner.ts   .vsix privacy-label scanner
  memory.ts            project memory (human-confirmed organelles)
  model/               router (online/offline+profiles) + adapters + tool-calling
  selfcheck.ts         runs the brain with no network
src/main/      Electron main: window, menu, keychain, pty, IPC, .vsix unzip, Open VSX
src/renderer/  Monaco + tabs + terminal + PSE panels, dark, SR/EN
docs/          bilingual user guide
```

## The three layers

1. **Shell** — Electron + Monaco (Phase 0). Theia is the Phase-1 target for running
   third-party VSCode extensions.
2. **Model layer (Path 1)** — Claude / Mistral / Groq / local llama.cpp GGUF.
3. **PSE governor** — theta, two-axis gate, Seldon, attractors, channel-guard,
   Guardian scanner, project memory.

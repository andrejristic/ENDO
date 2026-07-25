<h1 align="center">Endo</h1>

<p align="center">
  <b>A boundaried, PSE-governed code IDE.</b><br>
  Its Guardian tells you <i>who can watch/listen to you</i> before you install anything.
</p>

<p align="center">
  <a href="https://github.com/andrejristic/ENDO/releases/latest">⬇️ Download</a> ·
  <a href="docs/GUIDE.en.md">Guide (EN)</a> ·
  <a href="docs/GUIDE.sr.md">Vodič (SR)</a> ·
  <a href="STATUS.md">Status</a>
</p>

---

Endo is a dark, tabbed code editor whose AI assistant treats **boundaries as
architecture, not an afterthought**. It runs on the PSE (Partial Self-Extension)
kernel: your wellbeing is the agent's *internal coherence*, not an external score it
can game. And it ships with a **Guardian** — a scanner that shows you, before you
install any extension, exactly who receives your data and what the extension can see
and do.

## Why it's different

- **PSE-governed assistant (Endo).** Reads, edits, creates, and runs through tools —
  but every consequential action passes a two-axis check: *necessity* sets how
  decisively it acts (theta), *consequence* decides whether it stops and asks you
  first. Irreversible or outbound actions always ask.
- **Guardian extension scanner.** Install from Open VSX or a local `.vsix` and get a
  **privacy label**: named third parties that receive your data, what it can see
  (keystrokes, terminal, env, credentials…), what it can do, and a BENIGN / ELEVATED /
  CRITICAL rating. Obfuscated code is itself a red flag.
- **Provenance you can see.** Every answer is badged **PSE-governed** or **third-party
  (screened, not governed)** — you always know what you're looking at.
- **Theta panel.** Watch each agent's health as a theta/time graph — green when
  focused, red when it drifts, with a suggestion to bring it back.
- **Your models, your keys.** Claude / Mistral / Groq, or a fully local `.gguf` via
  llama.cpp. Online → API, offline → local, automatically. Keys live in the OS
  keychain.
- **Dark. Bilingual (SR/EN). Terminal on a button. Tabs over window-piles.**

## Download

Grab the latest build for your OS from **[Releases](https://github.com/andrejristic/ENDO/releases/latest)**:
`.deb` and `.AppImage` (Linux), `.exe` (Windows). Free.

## Build from source

```bash
npm install
npm run selfcheck   # verify the PSE brain (no network) → ALL PASS
npm run start       # launch
npm run dist        # build the .deb
```

See **[BUILD.md](BUILD.md)** for prerequisites and **[docs/RELEASE.md](docs/RELEASE.md)**
for the cloud release flow.

## How it works

Three clean layers: an **Electron + Monaco** shell, a **model layer** (Path 1 —
PSE-governed), and the **PSE governor** (theta, the two-axis gate, Seldon games, the
four attractors, the channel-guard, the Guardian scanner, project memory,
swarm + Physician). The brain lives in `src/core/` and is verified by a no-network
self-check. Design docs: the `PSE_*` files in the parent folder; per-area detail in
[`STATUS.md`](STATUS.md).

## Editions

- **Endo Core** — this repo. Pure, boundaried, no third-party extension execution.
- **Endo Max** — coming: the Theia edition that *runs* Open VSX extensions, each
  screened by the Guardian first.

## Screenshots

<!-- Drop images here: open this README on GitHub → Edit (pencil) → drag a screenshot
     into the text; GitHub uploads it and inserts the link automatically. -->

## Author & license

Created by **Andrej Ristic / ZeravaTech Inc.** Free to use; authorship retained. See
[`LICENSE`](LICENSE).

# PSE IDE — Guide (English)

Ordered most-important to least.

---

## 1. What PSE IDE is (most important)

A code editor whose AI assistant Endo treats **boundaries as architecture, not an
afterthought**. The kernel (PSE — Partial Self-Extension) treats your wellbeing as the
agent's *internal coherence*, not an external reward it can game. It ships with a
**Guardian** that tells you **who can watch/listen to you before you install any
extension**.

## 2. Two paths — what is "PSE-governed" and what isn't

- **Path 1 (PSE-governed):** the assistant Endo works through our model layer (Claude /
  Mistral / Groq or a local GGUF). All guarantees apply: theta, the gate, Seldon, the
  channel-guard. Such output carries a **purple "PSE-governed" badge**.
- **Path 2 (third-party):** you code with someone else's extension. PSE cannot enter
  that black box — the Guardian only screens it. Such output carries a **grey
  "third-party (screened, not governed)" badge**. You always know what you're looking at.

## 3. Theta — the agent's health (heart of the kernel)

Theta is how other-directed the agent is.
- **Toward you (the human): always 30 ±5.** Fixed.
- **Toward things (files/tools): [15–45] by how necessary the action is** — necessary
  = 15 (decisive), optional = 45 (tentative). The more it does the task, the closer to
  its anchor; the more it strays, the further.
- **Theta panel (θ button):** each active agent has an icon. Click → a theta/time
  graph. **Green = all good, red = drifted**, with a suggestion of what to type to
  bring it back.

## 4. Two axes — speed vs. does-it-stop-for-you

- **Axis 1 (necessity) → theta:** how decisively the agent acts.
- **Axis 2 (consequence) → the gate:** if an action is **irreversible or outbound**
  (delete, `push`, deploy, send data), the agent **stops and asks you**, regardless of
  necessity. You may pre-authorize a category per repo; but `push`/`deploy`/delete/
  send-external **always ask**.

## 5. The Guardian extension scanner (why this is an IDE)

When installing from Open VSX or a `.vsix` file, you get a **privacy label**:
- **Who receives your data** (named: Microsoft, Sentry… + unknown domains)
- **What it can see** (your keystrokes, terminal, env, credentials…)
- **What it can do** (shell commands, remote loader…)
- Level: **BENIGN / ELEVATED / CRITICAL**. Obfuscation is itself a red flag.
- There is always an **"Install anyway"** — you decide (with a small joke on CRITICAL).

## 6. Models (Path 1)

Settings → enter a key (Claude/Mistral/Groq) **and/or** a path to a local llama.cpp
(`llama-server`). With both set: **online → API, offline → GGUF**, automatically, always
overridable in the menu. Keys go into the **OS keychain**, per **profile** (e.g.
"work"/"personal"). Tool-calling is native where supported, otherwise via a fallback.

## 7. Project memory (Organelle)

The agent permanently remembers **understanding** of the project (architecture,
conventions, commands, fixes) — never raw files or secrets. Nothing becomes permanent
**without your confirmation** ("Remember this? Yes/No"). It lives in app-data; a menu
option exports it to a repo (on your machine or online, with a path and credentials).

## 8. Terminal and tabs

The terminal is **on a button** (View → Terminal, `Ctrl+T`): it opens a bottom panel.
Tabs are preferred over a pile of windows.

## 9. Language

The **SR/EN** button (bottom-left) or the Language menu. Everything in the GUI is
either Serbian or English, never mixed.

## 10. A note on phases (least important now)

This release (Phase 0) is Electron+Monaco. **Running** third-party VSCode extensions
and runtime monitoring of their traffic arrive in Phase 1 (Theia). The Guardian
scanner, the assistant Endo, and all PSE guarantees work already.

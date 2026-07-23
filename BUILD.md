# PSE IDE — Build to `.deb`

You are here because the design is done and the code is written. These are the only
terminal steps left to produce a Debian/Ubuntu `.deb`.

## 0. Prerequisites (one time)

You need **Node.js 20+** and build tools for the two native modules (`node-pty`,
`keytar`).

```bash
# Node 20 via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# reopen the shell, then:
nvm install 20 && nvm use 20

# Native build deps + keytar's libsecret (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y build-essential python3 libsecret-1-dev
```

## 1. Build the `.deb`  (the "couple of actions")

```bash
cd "~/Desktop/PSE IDE/pse-ide"
npm install
npm run dist
```

That is it. The package appears in `release/` as `pse-ide_0.1.0_amd64.deb`.

Install and run:

```bash
sudo dpkg -i "release/pse-ide_0.1.0_amd64.deb"
pse-ide
```

## Optional checks before packaging

```bash
npm run build:core && npm run selfcheck   # runs the PSE brain, no network — must print ALL PASS
npm run start                             # launch from source without packaging
npm run dist:dir                          # unpacked build in release/linux-unpacked (faster to test)
```

## Icon (optional)

electron-builder uses a default icon. To brand it, drop a 512×512 PNG at
`assets/icon.png` and re-add `"icon": "assets/icon.png"` under `build.linux` in
`package.json`.

## If `npm install` rebuilds fail

`node-pty` / `keytar` are native. If a prebuilt binary is missing for your Electron
version, force a rebuild:

```bash
npx electron-rebuild -f -w node-pty,keytar
npm run dist
```

## What the `.deb` contains (Phase 0)

A dark, tabbed IDE (Monaco editor, integrated terminal on a button), the PSE copilot
on PATH 1 (Claude / Mistral / Groq / local llama.cpp GGUF), the theta panel, the
Guardian extension scanner over Open VSX and local `.vsix` files, project memory, and
SR/EN. See `STATUS.md` for what is Phase 1 (Theia + running third-party extensions).

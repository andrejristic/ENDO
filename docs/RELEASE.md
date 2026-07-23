# Releasing Endo — deb + exe, built in GitHub's cloud

**Your machine does almost nothing.** GitHub Actions builds everything (including the
Windows `.exe`) on GitHub's own servers. Your Surface only needs `git` to push. That
is exactly why this suits a weak laptop.

## One-time setup

1. Create a GitHub account + a new repository (e.g. `endo`). Public repo = unlimited
   free Actions minutes.
2. From `~/Desktop/PSE IDE/pse-ide`, push the code:
   ```bash
   cd "/home/a/Desktop/PSE IDE/pse-ide"
   git init
   git add -A
   git commit -m "Endo Core"
   git branch -M main
   git remote add origin https://github.com/<your-user>/endo.git
   git push -u origin main
   ```
3. In the repo on github.com: **Settings → Actions → General → Workflow permissions →
   "Read and write permissions" → Save.** (This is the step that usually makes releases
   "not work" — without it the workflow can't upload the files.)

## Cut a release (each time)

```bash
git tag v0.1.0
git push origin v0.1.0
```

That's it. Pushing the tag triggers `.github/workflows/release.yml`. Watch it under the
repo's **Actions** tab. When both jobs finish (~5–10 min), the repo's **Releases** page
has `endo_0.1.0_amd64.deb`, `Endo-0.1.0.AppImage`, and `Endo Setup 0.1.0.exe` attached.

## Why your earlier attempt failed (most likely)

- The workflow file must be at exactly `.github/workflows/<name>.yml` (it is now).
- Workflow permissions were probably read-only (fix in step 3 above).
- You must push a **tag** (`v*`), not just a commit, to trigger it.

## If a runner errors on native modules (keytar / node-pty)

Rare on the hosted runners (they ship build tools). If it happens, the log names the
module; add its prebuild step or `npx electron-rebuild` before the build line.

## Local fallback (no cloud)

- Linux `.deb` + `.AppImage`: `npm run dist:free` (works on your machine now).
- Windows `.exe` locally would need `wine` — not worth it; let the cloud do it.

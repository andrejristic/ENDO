/**
 * Electron main process. Owns the window, the native menu (terminal-on-a-button,
 * SR/EN toggle), and every privileged operation via IPC: keychain, pty terminal,
 * filesystem, .vsix scanning, Open VSX, and PATH-1 model calls.
 */
import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { scanExtension, ExtensionBundle, PrivacyLabel } from '../core/guardianScanner';
import { ModelRouter, RouterConfig } from '../core/model/router';
import { CompletionRequest } from '../core/model/types';
import { spawn, exec, ChildProcess } from 'node:child_process';
import { registerPty } from './pty';
import * as keychain from './keychain';

const DARK_BG = '#0d1117';
let win: BrowserWindow | null = null;
let lang: 'sr' | 'en' = 'sr';

function createWindow() {
  win = new BrowserWindow({
    width: 1360, height: 860, backgroundColor: DARK_BG, show: false,
    title: 'Endo',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
    },
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.once('ready-to-show', () => win!.show());
  buildMenu();
}

function tr(sr: string, en: string) { return lang === 'sr' ? sr : en; }

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: tr('Fajl', 'File'),
      submenu: [
        { label: tr('Otvori folder…', 'Open folder…'), accelerator: 'CmdOrCtrl+O', click: openFolder },
        { label: tr('Sačuvaj', 'Save'), accelerator: 'CmdOrCtrl+S', click: () => win?.webContents.send('menu:save') },
        { type: 'separator' },
        { role: 'quit', label: tr('Izlaz', 'Quit') },
      ],
    },
    {
      label: tr('Prikaz', 'View'),
      submenu: [
        { label: tr('Terminal', 'Terminal'), accelerator: 'CmdOrCtrl+T', click: () => win?.webContents.send('menu:toggleTerminal') },
        { label: 'Endo', accelerator: 'CmdOrCtrl+E', click: () => win?.webContents.send('menu:toggleChat') },
        { label: tr('Theta', 'Theta'), click: () => win?.webContents.send('menu:toggleTheta') },
        { type: 'separator' },
        { role: 'zoomIn', accelerator: 'CmdOrCtrl+Plus' },
        { role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
        { role: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: tr('Ekstenzije', 'Extensions'),
      submenu: [
        { label: tr('Pretraži Open VSX…', 'Browse Open VSX…'), click: () => win?.webContents.send('menu:extensions') },
        { label: tr('Skeniraj .vsix fajl…', 'Scan a .vsix file…'), click: scanVsixDialog },
      ],
    },
    {
      label: tr('Jezik', 'Language'),
      submenu: [
        { label: 'Srpski', type: 'radio', checked: lang === 'sr', click: () => setLang('sr') },
        { label: 'English', type: 'radio', checked: lang === 'en', click: () => setLang('en') },
      ],
    },
    {
      label: tr('Pomoć', 'Help'),
      submenu: [
        { label: tr('Vodič (SR)', 'Guide (SR)'), click: () => openGuide('sr') },
        { label: tr('Guide (EN)', 'Guide (EN)'), click: () => openGuide('en') },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function setLang(l: 'sr' | 'en') { lang = l; buildMenu(); win?.webContents.send('menu:lang', l); }

async function openFolder() {
  const r = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] });
  if (!r.canceled && r.filePaths[0]) win?.webContents.send('menu:openFolder', r.filePaths[0]);
}

async function openGuide(l: 'sr' | 'en') {
  const p = app.isPackaged
    ? path.join(process.resourcesPath, 'docs', `GUIDE.${l}.md`)
    : path.join(__dirname, '..', '..', 'docs', `GUIDE.${l}.md`);
  shell.openPath(p);
}

async function scanVsixDialog() {
  const r = await dialog.showOpenDialog(win!, { properties: ['openFile'], filters: [{ name: 'VSIX', extensions: ['vsix'] }] });
  if (r.canceled || !r.filePaths[0]) return;
  const label = await scanVsixFile(r.filePaths[0]);
  win?.webContents.send('scan:result', label);
}

// --- .vsix scanning: unzip, feed sources to the dependency-free scanner ---
async function scanVsixFile(vsixPath: string): Promise<PrivacyLabel> {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(vsixPath);
  const files: Record<string, string> = {};
  let packageJson: any = {};
  for (const entry of zip.getEntries()) {
    const name: string = entry.entryName;
    if (entry.isDirectory) continue;
    if (name.endsWith('.js') || name.endsWith('.json')) {
      const text = entry.getData().toString('utf8');
      files[name] = text;
      if (/(^|\/)extension\/package\.json$/.test(name) || name === 'extension/package.json') {
        try { packageJson = JSON.parse(text); } catch { /* keep {} */ }
      }
    }
  }
  const bundle: ExtensionBundle = { packageJson, files };
  return scanExtension(bundle);
}

// --- Open VSX (browse + download) ---
async function vsxSearch(query: string): Promise<any> {
  const res = await fetch(`https://open-vsx.org/api/-/search?query=${encodeURIComponent(query)}&size=25`);
  return res.json();
}
async function vsxDownloadAndScan(namespace: string, name: string): Promise<{ label: PrivacyLabel; path: string }> {
  const meta = await (await fetch(`https://open-vsx.org/api/${namespace}/${name}`)).json();
  const url = meta?.files?.download;
  if (!url) throw new Error('no download url');
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const dest = path.join(app.getPath('userData'), 'extensions', `${namespace}.${name}.vsix`);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, buf);
  const label = await scanVsixFile(dest);
  return { label, path: dest };
}

// --- IPC ---
function registerIpc() {
  ipcMain.handle('keychain:set', (_e, service, account, secret) => keychain.set(service, account, secret));
  ipcMain.handle('keychain:get', (_e, service, account) => keychain.get(service, account));

  ipcMain.handle('fs:read', (_e, p) => fs.readFile(p, 'utf8'));
  ipcMain.handle('fs:write', (_e, p, c) => fs.writeFile(p, c, 'utf8'));
  ipcMain.handle('fs:list', async (_e, dir) => {
    const items = await fs.readdir(dir, { withFileTypes: true });
    return items.map((d) => ({ name: d.name, dir: d.isDirectory() }));
  });

  ipcMain.handle('vsix:scan', (_e, p) => scanVsixFile(p));
  ipcMain.handle('vsx:search', (_e, q) => vsxSearch(q));
  ipcMain.handle('vsx:downloadScan', (_e, ns, name) => vsxDownloadAndScan(ns, name));

  ipcMain.handle('memory:load', async () => {
    const p = path.join(app.getPath('userData'), 'project-memory.json');
    try { return await fs.readFile(p, 'utf8'); } catch { return '[]'; }
  });
  ipcMain.handle('memory:save', async (_e, json) => {
    const p = path.join(app.getPath('userData'), 'project-memory.json');
    await fs.writeFile(p, json, 'utf8');
  });
  ipcMain.handle('memory:export', async (_e, json, dest) => { await fs.writeFile(dest, json, 'utf8'); });

  // PATH-1 model call. Keys are read from the keychain here (never in the renderer).
  ipcMain.handle('model:complete', async (_e, cfg: {
    profile: string; override: RouterConfig['override']; preferredOnline: any;
    ggufEndpoint?: string; model?: string;
  }, req: CompletionRequest) => {
    const SERVICE = 'pse-ide';
    const keys: any = {};
    for (const prov of ['anthropic', 'mistral', 'groq'] as const) {
      const k = await keychain.get(SERVICE, `${cfg.profile}:${prov}`);
      if (k) keys[prov] = k;
    }
    const router = new ModelRouter({
      profiles: [{ name: cfg.profile, keys, ggufEndpoint: cfg.ggufEndpoint }],
      activeProfile: cfg.profile,
      override: cfg.override,
      preferredOnline: cfg.preferredOnline,
      isOnline: () => true,
    });
    return router.complete(req, cfg.model); // governed:true -> renderer shows the PSE badge
  });

  // Phase 1: tool execution + dialogs + search
  ipcMain.handle('dialog:openFolder', async () => {
    const r = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] });
    return r.canceled ? null : r.filePaths[0];
  });
  ipcMain.handle('dialog:openGguf', async () => {
    const r = await dialog.showOpenDialog(win!, { properties: ['openFile'], filters: [{ name: 'GGUF', extensions: ['gguf'] }] });
    return r.canceled ? null : r.filePaths[0];
  });
  ipcMain.handle('fs:create', (_e, p, c) => fs.writeFile(p, c ?? '', { flag: 'wx' }).then(() => 'created'));
  ipcMain.handle('fs:delete', (_e, p) => fs.rm(p).then(() => 'deleted'));
  ipcMain.handle('cmd:run', (_e, cmd: string, cwd?: string) => new Promise((resolve) => {
    exec(cmd, { cwd: cwd || app.getPath('home'), timeout: 120000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => resolve((stdout || '') + (stderr || '') + (err ? `\n[exit ${err.code}]` : '\n[ok]')));
  }));
  ipcMain.handle('search:files', async (_e, dir: string, query: string) => new Promise((resolve) => {
    exec(`grep -rniI --exclude-dir=node_modules --exclude-dir=.git -- ${JSON.stringify(query)} .`,
      { cwd: dir, timeout: 30000, maxBuffer: 4 * 1024 * 1024 },
      (_err, stdout) => resolve((stdout || '').split('\n').slice(0, 200).join('\n')));
  }));

  // Phase 2: llama.cpp lifecycle
  ipcMain.handle('llama:start', (_e, ggufPath: string, port = 8080) => startLlama(ggufPath, port));
  ipcMain.handle('llama:stop', () => stopLlama());
  ipcMain.handle('llama:status', () => ({ running: llama !== null, path: llamaPath }));

  registerPty(ipcMain, () => win);
}

// --- llama.cpp (llama-server) process management ---
let llama: ChildProcess | null = null;
let llamaPath = '';
function startLlama(ggufPath: string, port: number): { ok: boolean; msg: string } {
  if (llama) return { ok: true, msg: 'already running' };
  try {
    llama = spawn('llama-server', ['-m', ggufPath, '--port', String(port), '--host', '127.0.0.1'], { stdio: 'ignore' });
    llamaPath = ggufPath;
    llama.on('exit', () => { llama = null; llamaPath = ''; });
    return { ok: true, msg: `llama-server on :${port}` };
  } catch (e: any) {
    llama = null;
    return { ok: false, msg: 'llama-server not found on PATH — install llama.cpp. ' + e.message };
  }
}
function stopLlama(): { ok: boolean } { llama?.kill(); llama = null; llamaPath = ''; return { ok: true }; }

app.whenReady().then(() => { registerIpc(); createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

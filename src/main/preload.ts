/** Preload — the only bridge between renderer and privileged main. */
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // menu events -> renderer
  on: (channel: string, cb: (...a: any[]) => void) => {
    const allowed = ['menu:save', 'menu:toggleTerminal', 'menu:toggleChat', 'menu:toggleTheta',
      'menu:openFolder', 'menu:extensions', 'menu:lang', 'scan:result', 'pty:data', 'pty:exit'];
    if (allowed.includes(channel)) ipcRenderer.on(channel, (_e, ...a) => cb(...a));
  },
  // keychain
  keychainSet: (s: string, a: string, secret: string) => ipcRenderer.invoke('keychain:set', s, a, secret),
  keychainGet: (s: string, a: string) => ipcRenderer.invoke('keychain:get', s, a),
  // fs
  readFile: (p: string) => ipcRenderer.invoke('fs:read', p),
  writeFile: (p: string, c: string) => ipcRenderer.invoke('fs:write', p, c),
  createFile: (p: string, c: string) => ipcRenderer.invoke('fs:create', p, c),
  deleteFile: (p: string) => ipcRenderer.invoke('fs:delete', p),
  listDir: (d: string) => ipcRenderer.invoke('fs:list', d),
  // tools / dialogs / search (Phase 1)
  runCommand: (cmd: string, cwd?: string) => ipcRenderer.invoke('cmd:run', cmd, cwd),
  searchFiles: (dir: string, q: string) => ipcRenderer.invoke('search:files', dir, q),
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),
  openGgufDialog: () => ipcRenderer.invoke('dialog:openGguf'),
  // llama.cpp (Phase 2)
  llamaStart: (p: string, port?: number) => ipcRenderer.invoke('llama:start', p, port),
  llamaStop: () => ipcRenderer.invoke('llama:stop'),
  llamaStatus: () => ipcRenderer.invoke('llama:status'),
  // terminal
  ptySpawn: (cwd?: string) => ipcRenderer.invoke('pty:spawn', cwd),
  ptyWrite: (id: number, data: string) => ipcRenderer.invoke('pty:write', id, data),
  ptyResize: (id: number, c: number, r: number) => ipcRenderer.invoke('pty:resize', id, c, r),
  ptyKill: (id: number) => ipcRenderer.invoke('pty:kill', id),
  // guardian / extensions
  scanVsix: (p: string) => ipcRenderer.invoke('vsix:scan', p),
  vsxSearch: (q: string) => ipcRenderer.invoke('vsx:search', q),
  vsxDownloadScan: (ns: string, name: string) => ipcRenderer.invoke('vsx:downloadScan', ns, name),
  // memory
  memoryLoad: () => ipcRenderer.invoke('memory:load'),
  memorySave: (json: string) => ipcRenderer.invoke('memory:save', json),
  memoryExport: (json: string, dest: string) => ipcRenderer.invoke('memory:export', json, dest),
  // model (PATH 1)
  modelComplete: (cfg: any, req: any) => ipcRenderer.invoke('model:complete', cfg, req),
};

contextBridge.exposeInMainWorld('pse', api);
export type PseApi = typeof api;

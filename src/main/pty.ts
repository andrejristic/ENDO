/** Integrated terminal via node-pty. Terminal-on-a-button toggles the renderer
 *  panel; each panel binds to a pty here. */
import type { IpcMain, BrowserWindow } from 'electron';
import * as os from 'node:os';

const ptys = new Map<number, any>();
let nextId = 1;

export function registerPty(ipcMain: IpcMain, getWin: () => BrowserWindow | null) {
  const pty = require('node-pty');

  ipcMain.handle('pty:spawn', (_e, cwd?: string) => {
    const shellPath = process.env.SHELL || (process.platform === 'win32' ? 'powershell.exe' : 'bash');
    const p = pty.spawn(shellPath, [], {
      name: 'xterm-color', cols: 80, rows: 24,
      cwd: cwd || os.homedir(), env: process.env as any,
    });
    const id = nextId++;
    ptys.set(id, p);
    p.onData((data: string) => getWin()?.webContents.send('pty:data', id, data));
    p.onExit(() => { ptys.delete(id); getWin()?.webContents.send('pty:exit', id); });
    return id;
  });

  ipcMain.handle('pty:write', (_e, id: number, data: string) => { ptys.get(id)?.write(data); });
  ipcMain.handle('pty:resize', (_e, id: number, cols: number, rows: number) => { ptys.get(id)?.resize(cols, rows); });
  ipcMain.handle('pty:kill', (_e, id: number) => { ptys.get(id)?.kill(); ptys.delete(id); });
}

import { app, shell, type IpcMain } from 'electron';

export function registerShellIpc(ipcMain: IpcMain): void {
  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    if (/^https?:\/\//.test(url)) await shell.openExternal(url);
  });
  ipcMain.handle('shell:getAppVersion', async () => app.getVersion());
}

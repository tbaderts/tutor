import type { IpcMain } from 'electron';
import type { HistoryService } from '../services/HistoryService';

export function registerHistoryIpc(ipcMain: IpcMain, history: HistoryService): void {
  ipcMain.handle('history:list', async () => history.list());
  ipcMain.handle('history:add', async (_event, entry) => history.add(entry));
  ipcMain.handle('history:clear', async () => history.clear());
}

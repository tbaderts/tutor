import type { IpcMain } from 'electron';
import type { ConfigService } from '../services/ConfigService';
import type { TutorConfig } from '../../shared/types/config';

/** `onSaved` lets main react to settings changes, e.g. restarting the speech engine. */
export function registerConfigIpc(
  ipcMain: IpcMain,
  configService: ConfigService,
  onSaved: (previous: TutorConfig, config: TutorConfig) => void,
): void {
  ipcMain.handle('config:load', async () => configService.getConfig());

  ipcMain.handle('config:save', async (_event, config: TutorConfig) => {
    const previous = configService.getConfig();
    await configService.save(config);
    onSaved(previous, config);
  });
}

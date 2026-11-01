import type { IpcMain } from 'electron';
import type { OllamaService } from '../services/OllamaService';
import type { SpeechService } from '../services/SpeechService';
import type { SystemStatus } from '../../shared/types/tutor';

export function registerSystemIpc(
  ipcMain: IpcMain,
  ollama: OllamaService,
  speech: SpeechService,
  restartSpeech: () => Promise<void>,
): void {
  ipcMain.handle('system:status', async (): Promise<SystemStatus> => {
    const [llm, speechStatus] = await Promise.all([ollama.status(), speech.status()]);
    return { llm, speech: speechStatus };
  });

  ipcMain.handle('system:restartSpeech', async () => restartSpeech());
}

import type { IpcMain } from 'electron';
import type { ConfigService } from '../services/ConfigService';
import type { SpeechService, SpeechSettings } from '../services/SpeechService';
import { targetLanguage, voiceFor } from '../../shared/languages';

/** Voice, speed and languages come from the saved settings, so the renderer only sends text or audio. */
export function registerSpeechIpc(
  ipcMain: IpcMain,
  configService: ConfigService,
  speech: SpeechService,
  settings: () => SpeechSettings,
): void {
  ipcMain.handle('speech:synthesize', async (_event, text: string, speed?: number) => {
    const { general, speech: s } = configService.getConfig();
    const voice = voiceFor(general.targetLanguage, s.voice);
    return speech.synthesize(text, voice, speed ?? s.speed, targetLanguage(general.targetLanguage).tts);
  });

  ipcMain.handle('speech:transcribe', async (_event, samples: Float32Array) => {
    const lang = targetLanguage(configService.getConfig().general.targetLanguage).stt;
    return speech.transcribe(samples, lang, settings());
  });
}

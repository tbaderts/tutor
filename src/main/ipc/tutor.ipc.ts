import type { IpcMain } from 'electron';
import type { ConfigService } from '../services/ConfigService';
import type { OllamaService } from '../services/OllamaService';
import { nativeLanguageName, targetLanguage } from '../../shared/languages';
import { assistantPrompt, evaluatePrompt, freeSpeechPrompt, recallPrompt, translatePrompt, type AskContext } from '../../shared/prompts';
import type { ChatMessage, Evaluation, FreeCheck, Verdict } from '../../shared/types/tutor';

/** Keeps the Ask prompt small enough for a 4B model. */
const ASK_HISTORY = 12;

function verdictOf(value: unknown): Verdict {
  const v = String(value ?? '').toLowerCase();
  return v === 'correct' || v === 'almost' || v === 'incorrect' ? v : '?';
}

const str = (value: unknown) => (typeof value === 'string' ? value : '');

export function registerTutorIpc(ipcMain: IpcMain, configService: ConfigService, ollama: OllamaService): void {
  const names = () => {
    const { nativeLanguage, targetLanguage: target } = configService.getConfig().general;
    return { native: nativeLanguageName(nativeLanguage), target: targetLanguage(target).name };
  };

  ipcMain.handle('tutor:translate', async (_event, text: string) => {
    const { native, target } = names();
    return ollama.chat(translatePrompt(native, target), text);
  });

  ipcMain.handle(
    'tutor:evaluate',
    async (_event, target: string, heard: string, unsure: string[], score: number, cue?: string): Promise<Evaluation> => {
      const n = names();
      const attempt = `HEARD: ${heard}\nUNSURE: ${unsure.join(', ') || 'none'}\nWord match score: ${score}%`;
      const res = cue
        ? await ollama.chatJson(recallPrompt(n.native, n.target), `CUE: ${cue}\nEXPECTED: ${target}\n${attempt}`)
        : await ollama.chatJson(evaluatePrompt(n.native, n.target), `TARGET: ${target}\n${attempt}`);
      return { verdict: verdictOf(res.verdict), feedback: str(res.feedback), tip: str(res.tip) };
    },
  );

  ipcMain.handle('tutor:checkFree', async (_event, heard: string): Promise<FreeCheck> => {
    const n = names();
    const res = await ollama.chatJson(freeSpeechPrompt(n.native, n.target), heard);
    return { verdict: verdictOf(res.verdict), corrected: str(res.corrected), meaning: str(res.meaning), feedback: str(res.feedback) };
  });

  ipcMain.handle('tutor:ask', async (event, requestId: string, messages: ChatMessage[], context: AskContext) => {
    const n = names();
    return ollama.chatStream(assistantPrompt(n.native, n.target, context), messages.slice(-ASK_HISTORY), (chunk) => {
      if (!event.sender.isDestroyed()) event.sender.send('tutor:chunk', requestId, chunk);
    });
  });
}

import type { TutorConfig } from './config';
import type { AskContext } from '../prompts';
import type { ChatMessage, Evaluation, FreeCheck, HistoryEntry, SystemStatus, Transcript } from './tutor';

export type ViewId = 'practice' | 'free' | 'ask' | 'history' | 'settings' | 'about';

export interface TutorAPI {
  config: {
    load(): Promise<TutorConfig>;
    save(config: TutorConfig): Promise<void>;
  };
  system: {
    status(): Promise<SystemStatus>;
    restartSpeech(): Promise<void>;
  };
  speech: {
    /** WAV bytes of the sentence in the target language. */
    synthesize(text: string, speed?: number): Promise<Uint8Array>;
    /** 16 kHz mono samples in the target language. */
    transcribe(samples: Float32Array): Promise<Transcript>;
  };
  tutor: {
    translate(text: string): Promise<string>;
    evaluate(target: string, heard: string, unsure: string[], score: number): Promise<Evaluation>;
    checkFree(heard: string): Promise<FreeCheck>;
    /** Streams the teacher's answer through `onChunk` and resolves with the full text. */
    ask(messages: ChatMessage[], context: AskContext, onChunk: (chunk: string) => void): Promise<string>;
  };
  history: {
    list(): Promise<HistoryEntry[]>;
    add(entry: Omit<HistoryEntry, 'id' | 'at'>): Promise<HistoryEntry>;
    clear(): Promise<void>;
  };
  shell: {
    openExternal(url: string): Promise<void>;
    getAppVersion(): Promise<string>;
  };
  /** Menu navigation (File → Settings, Help → About). Returns an unsubscribe function. */
  onNavigate(listener: (view: ViewId) => void): () => void;
}

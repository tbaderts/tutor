import type { TutorConfig } from './config';
import type { AskContext } from '../prompts';
import type { ChatMessage, Evaluation, FreeCheck, HistoryEntry, SystemStatus, Transcript } from './tutor';
import type { ItemProgress, LessonCatalog, ProgressMap } from './lessons';
import type { GeneratedDraft, GenerateRequest } from '../lessonGen';

export type ViewId = 'lessons' | 'practice' | 'free' | 'ask' | 'history' | 'settings' | 'about';

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
    /** WAV bytes of the sentence in the target language; voice and speed default to the settings. */
    synthesize(text: string, options?: { speed?: number; voice?: string }): Promise<Uint8Array>;
    /** 16 kHz mono samples in the target language. */
    transcribe(samples: Float32Array): Promise<Transcript>;
  };
  tutor: {
    translate(text: string): Promise<string>;
    /**
     * Judges an attempt. With `cue` (English the learner had to say from memory), any correct answer
     * with that meaning is accepted, not only `target`.
     */
    evaluate(target: string, heard: string, unsure: string[], score: number, cue?: string): Promise<Evaluation>;
    checkFree(heard: string): Promise<FreeCheck>;
    /** Streams the teacher's answer through `onChunk` and resolves with the full text. */
    ask(messages: ChatMessage[], context: AskContext, onChunk: (chunk: string) => void): Promise<string>;
  };
  lessons: {
    /** Lessons for the language being practised. */
    catalog(): Promise<LessonCatalog>;
    progress(): Promise<ProgressMap>;
    record(key: string, score: number): Promise<ItemProgress>;
    resetProgress(lessonId: string): Promise<void>;
    /** Opens (and creates) the folder for the user's own lessons. */
    openFolder(): Promise<void>;
    /** Has the model write a lesson; `onProgress` gets the characters written so far. Nothing is saved. */
    generate(request: GenerateRequest, onProgress: (chars: number) => void): { requestId: string; result: Promise<GeneratedDraft> };
    cancelGenerate(requestId: string): Promise<void>;
    /** Saves a draft to the user's lessons folder; returns the file. */
    save(draft: GeneratedDraft): Promise<string>;
    /** Deletes one of the user's lessons and its progress. */
    delete(lessonId: string): Promise<void>;
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

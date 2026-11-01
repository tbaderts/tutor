export type Verdict = 'correct' | 'almost' | 'incorrect' | '?';

export interface Transcript {
  text: string;
  /** Words Whisper was less than 60 % sure about: a hint at unclear pronunciation. */
  unsure: string[];
}

export interface Evaluation {
  verdict: Verdict;
  feedback: string;
  tip: string;
}

export interface FreeCheck {
  verdict: Verdict;
  corrected: string;
  meaning: string;
  feedback: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface HistoryEntry {
  id: string;
  /** ISO timestamp. */
  at: string;
  targetLanguage: string;
  target: string;
  /** What the learner typed before translation, if anything. */
  source?: string;
  heard: string;
  score: number;
  verdict: Verdict;
}

export type EngineState = 'idle' | 'loading' | 'ready' | 'error';

export interface SpeechStatus {
  process: 'starting' | 'running' | 'stopped' | 'error';
  tts: EngineState;
  stt: EngineState;
  sttDevice?: string | null;
  sttModel?: string | null;
  download?: { file: string; percent: number } | null;
  error?: string | null;
  python?: string;
}

export interface LlmStatus {
  ok: boolean;
  models: string[];
  error?: string;
}

export interface SystemStatus {
  llm: LlmStatus;
  speech: SpeechStatus;
}

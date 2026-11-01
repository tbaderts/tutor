export type Theme = 'light' | 'dark' | 'system';
export type WhisperDevice = 'auto' | 'cuda' | 'cpu';

export interface TutorConfig {
  general: {
    theme: Theme;
    /** Language the learner types in and gets feedback in. */
    nativeLanguage: string;
    /** Language being practised. */
    targetLanguage: string;
  };
  llm: {
    host: string;
    model: string;
  };
  speech: {
    voice: string;
    speed: number;
    whisperModel: string;
    whisperDevice: WhisperDevice;
    /** Python interpreter for the speech sidecar; empty = auto-detect. */
    pythonPath: string;
    /** Where the Kokoro model files live; empty = ~/.tutor/models. */
    modelsDir: string;
  };
}

export const WHISPER_MODELS = ['large-v3-turbo', 'medium', 'small'] as const;

export const DEFAULT_CONFIG: TutorConfig = {
  general: {
    theme: 'system',
    nativeLanguage: 'en',
    targetLanguage: 'it',
  },
  llm: {
    host: 'http://localhost:11434',
    model: 'gemma3:4b',
  },
  speech: {
    voice: 'if_sara',
    speed: 1.0,
    whisperModel: 'large-v3-turbo',
    whisperDevice: 'auto',
    pythonPath: '',
    modelsDir: '',
  },
};

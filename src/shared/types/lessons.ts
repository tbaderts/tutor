/** Something to say: a word, a phrase or a challenge answer. */
export interface LessonItem {
  /** In the target language. */
  text: string;
  /** English meaning (the challenge cue). */
  en: string;
  note?: string;
  /** Other correct answers for a challenge item. */
  accept?: string[];
}

export interface DialogueLine {
  /** A name, or "you" for the learner's lines. */
  speaker: string;
  text: string;
  en: string;
}

export interface Dialogue {
  title: string;
  /** Picks a matching voice for each speaker; the learner uses the configured voice. */
  speakers?: Record<string, 'female' | 'male'>;
  lines: DialogueLine[];
}

export interface Lesson {
  id: string;
  topic: string;
  title: string;
  subtitle: string;
  level: string;
  goals: string[];
  vocabulary: LessonItem[];
  phrases: LessonItem[];
  /** Markdown. */
  grammar: string;
  dialogue?: Dialogue;
  challenge: LessonItem[];
  /** Ollama model that wrote the lesson, for AI-generated lessons. */
  generatedBy?: string;
  /** Where it was loaded from: shipped with the app, or the user's lessons folder. */
  source: 'bundled' | 'user';
  file: string;
}

export interface Topic {
  id: string;
  title: string;
  /** Title in the target language. */
  titleTarget?: string;
  description: string;
  /** lucide-react icon name. */
  icon?: string;
}

export interface LessonCatalog {
  topics: Topic[];
  lessons: Lesson[];
  /** Files that could not be read, with the reason; shown so hand-written lessons are easy to fix. */
  errors: string[];
  userDir: string;
}

export type LessonSection = 'vocabulary' | 'phrases' | 'dialogue' | 'challenge';

export interface ItemProgress {
  best: number;
  last: number;
  attempts: number;
  lastAt: string;
}

export type ProgressMap = Record<string, ItemProgress>;

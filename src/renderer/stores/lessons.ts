import { create } from 'zustand';
import type { LessonCatalog, ProgressMap } from '@shared/types/lessons';
import type { GeneratedDraft, GenerateRequest } from '@shared/lessonGen';
import { errorMessage } from '@/lib/utils';

interface Generation {
  requestId: string;
  chars: number;
  startedAt: number;
}

interface LessonsState {
  catalog: LessonCatalog | null;
  progress: ProgressMap;
  error: string | null;
  /** Lesson shown in the Lessons view; null shows the catalog. */
  openLessonId: string | null;
  /** The "Generate a lesson" page instead of the catalog. */
  generatorOpen: boolean;
  /** Last request, to prefill the form and to regenerate. */
  lastRequest: GenerateRequest | null;
  generation: Generation | null;
  generateError: string | null;
  /** Generated lesson shown for review; not saved yet. */
  draft: GeneratedDraft | null;

  load: () => Promise<void>;
  open: (lessonId: string | null) => void;
  record: (key: string, score: number) => Promise<void>;
  resetLesson: (lessonId: string) => Promise<void>;
  showGenerator: (open: boolean) => void;
  generate: (request: GenerateRequest) => Promise<void>;
  cancelGenerate: () => void;
  saveDraft: () => Promise<void>;
  /** Drops the draft (and progress made on it) and goes back to the form. */
  discardDraft: () => Promise<void>;
  deleteLesson: (lessonId: string) => Promise<void>;
}

export const useLessonsStore = create<LessonsState>((set, get) => ({
  catalog: null,
  progress: {},
  error: null,
  openLessonId: null,
  generatorOpen: false,
  lastRequest: null,
  generation: null,
  generateError: null,
  draft: null,

  load: async () => {
    try {
      const [catalog, progress] = await Promise.all([window.tutor.lessons.catalog(), window.tutor.lessons.progress()]);
      set({ catalog, progress, error: null });
    } catch (err) {
      set({ error: `Could not load lessons: ${errorMessage(err)}` });
    }
  },

  open: (lessonId) => set({ openLessonId: lessonId, generatorOpen: false }),

  record: async (key, score) => {
    const entry = await window.tutor.lessons.record(key, score);
    set((s) => ({ progress: { ...s.progress, [key]: entry } }));
  },

  resetLesson: async (lessonId) => {
    await window.tutor.lessons.resetProgress(lessonId);
    set({ progress: await window.tutor.lessons.progress() });
  },

  showGenerator: (open) => set({ generatorOpen: open, openLessonId: null, generateError: null }),

  generate: async (request) => {
    if (get().generation) return;
    // Regenerating replaces the draft; progress made on it goes too.
    const previous = get().draft;
    if (previous) void get().resetLesson(previous.lesson.id);
    const { requestId, result } = window.tutor.lessons.generate(request, (chars) =>
      set((s) => (s.generation?.requestId === requestId ? { generation: { ...s.generation, chars } } : {})),
    );
    set({ lastRequest: request, generation: { requestId, chars: 0, startedAt: Date.now() }, generateError: null, draft: null });
    try {
      const draft = await result;
      set({ draft, generation: null });
    } catch (err) {
      set({ generation: null, generateError: errorMessage(err) });
    }
  },

  cancelGenerate: () => {
    const g = get().generation;
    if (g) void window.tutor.lessons.cancelGenerate(g.requestId);
  },

  saveDraft: async () => {
    const draft = get().draft;
    if (!draft) return;
    await window.tutor.lessons.save(draft);
    set({ draft: null, generatorOpen: false });
    await get().load();
    set({ openLessonId: draft.lesson.id });
  },

  discardDraft: async () => {
    const draft = get().draft;
    set({ draft: null, generatorOpen: true });
    if (draft) await get().resetLesson(draft.lesson.id);
  },

  deleteLesson: async (lessonId) => {
    await window.tutor.lessons.delete(lessonId);
    set({ openLessonId: null });
    await get().load();
  },
}));

import { create } from 'zustand';
import { diffWords, type WordDiff } from '@shared/wordDiff';
import type { Evaluation } from '@shared/types/tutor';
import { playWav } from '@/lib/audio';
import { errorMessage } from '@/lib/utils';
import { useConfigStore } from './config';
import { useHistoryStore } from './history';

export interface Attempt {
  heard: string;
  unsure: string[];
  diff: WordDiff;
  evaluation: Evaluation | null;
}

type Busy = 'translating' | 'listening' | 'checking' | null;

interface PracticeState {
  /** Sentence in the target language being practised. */
  target: string | null;
  /** What the learner typed, when the target is a translation. */
  source: string | null;
  busy: Busy;
  playing: boolean;
  attempt: Attempt | null;
  error: string | null;
  /** Speaks the sentence and makes it the one to practise. */
  setTarget: (target: string, source?: string | null) => void;
  submit: (text: string, translate: boolean) => Promise<void>;
  play: (speed?: number) => Promise<void>;
  assess: (samples: Float32Array) => Promise<void>;
  retry: () => void;
}

export const usePracticeStore = create<PracticeState>((set, get) => ({
  target: null,
  source: null,
  busy: null,
  playing: false,
  attempt: null,
  error: null,

  setTarget: (target, source = null) => {
    set({ target: target.trim(), source, attempt: null, error: null });
    void get().play();
  },

  submit: async (text, translate) => {
    const input = text.trim();
    if (!input) return;
    if (!translate) return get().setTarget(input);
    set({ busy: 'translating', error: null });
    try {
      const target = await window.tutor.tutor.translate(input);
      set({ busy: null });
      get().setTarget(target, input);
    } catch (err) {
      set({ busy: null, error: `Translation failed: ${errorMessage(err)}` });
    }
  },

  play: async (speed) => {
    const target = get().target;
    if (!target) return;
    set({ playing: true });
    try {
      await playWav(await window.tutor.speech.synthesize(target, { speed }));
    } catch (err) {
      set({ error: `Could not speak the sentence: ${errorMessage(err)}` });
    } finally {
      set({ playing: false });
    }
  },

  assess: async (samples) => {
    const target = get().target;
    if (!target) return;
    set({ busy: 'listening', error: null, attempt: null });
    try {
      const { text: heard, unsure } = await window.tutor.speech.transcribe(samples);
      if (get().target !== target) return set({ busy: null }); // a new sentence arrived meanwhile
      if (!heard) {
        return set({ busy: null, error: "I didn't catch anything — try again a bit louder." });
      }
      const diff = diffWords(target, heard);
      set({ busy: 'checking', attempt: { heard, unsure, diff, evaluation: null } });
      const evaluation = await window.tutor.tutor.evaluate(target, heard, unsure, diff.score);
      if (get().target !== target) return set({ busy: null });
      set({ busy: null, attempt: { heard, unsure, diff, evaluation } });
      void useHistoryStore.getState().add({
        targetLanguage: useConfigStore.getState().config.general.targetLanguage,
        target,
        source: get().source ?? undefined,
        heard,
        score: diff.score,
        verdict: evaluation.verdict,
      });
    } catch (err) {
      set({ busy: null, error: errorMessage(err) });
    }
  },

  retry: () => set({ attempt: null, error: null }),
}));

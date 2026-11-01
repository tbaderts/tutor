import { create } from 'zustand';
import type { FreeCheck } from '@shared/types/tutor';
import { errorMessage } from '@/lib/utils';

interface FreeState {
  busy: 'listening' | 'checking' | null;
  heard: string | null;
  check: FreeCheck | null;
  error: string | null;
  assess: (samples: Float32Array) => Promise<void>;
}

export const useFreeStore = create<FreeState>((set) => ({
  busy: null,
  heard: null,
  check: null,
  error: null,

  assess: async (samples) => {
    set({ busy: 'listening', heard: null, check: null, error: null });
    try {
      const { text } = await window.tutor.speech.transcribe(samples);
      if (!text) return set({ busy: null, error: "I didn't catch anything — try again." });
      set({ busy: 'checking', heard: text });
      set({ busy: null, check: await window.tutor.tutor.checkFree(text) });
    } catch (err) {
      set({ busy: null, error: errorMessage(err) });
    }
  },
}));

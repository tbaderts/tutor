import { create } from 'zustand';
import type { HistoryEntry } from '@shared/types/tutor';

interface HistoryState {
  entries: HistoryEntry[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (entry: Omit<HistoryEntry, 'id' | 'at'>) => Promise<void>;
  clear: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  entries: [],
  loaded: false,

  load: async () => {
    set({ entries: await window.tutor.history.list(), loaded: true });
  },

  add: async (entry) => {
    const saved = await window.tutor.history.add(entry);
    set((s) => ({ entries: [saved, ...s.entries] }));
  },

  clear: async () => {
    await window.tutor.history.clear();
    set({ entries: [] });
  },
}));

import { create } from 'zustand';
import type { ChatMessage } from '@shared/types/tutor';
import { errorMessage } from '@/lib/utils';
import { usePracticeStore } from './practice';

interface AskState {
  messages: ChatMessage[];
  streaming: boolean;
  error: string | null;
  send: (question: string) => Promise<void>;
  clear: () => void;
}

export const useAskStore = create<AskState>((set, get) => ({
  messages: [],
  streaming: false,
  error: null,

  send: async (question) => {
    const q = question.trim();
    if (!q || get().streaming) return;
    const history: ChatMessage[] = [...get().messages, { role: 'user', content: q }];
    set({ messages: [...history, { role: 'assistant', content: '' }], streaming: true, error: null });

    // The teacher knows the sentence being practised, so "why this word?" needs no extra context.
    const { target, attempt } = usePracticeStore.getState();
    const context = { target: target ?? undefined, heard: attempt?.heard, verdict: attempt?.evaluation?.verdict };

    const appendToAnswer = (chunk: string) =>
      set((s) => {
        const messages = [...s.messages];
        const last = messages[messages.length - 1];
        messages[messages.length - 1] = { ...last, content: last.content + chunk };
        return { messages };
      });

    try {
      await window.tutor.tutor.ask(history, context, appendToAnswer);
      set({ streaming: false });
    } catch (err) {
      // Drop the empty answer bubble; keep a partial one.
      set((s) => ({
        streaming: false,
        error: `Error talking to Ollama: ${errorMessage(err)}`,
        messages: s.messages[s.messages.length - 1]?.content ? s.messages : s.messages.slice(0, -1),
      }));
    }
  },

  clear: () => set({ messages: [], error: null }),
}));

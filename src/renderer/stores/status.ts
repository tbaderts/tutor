import { create } from 'zustand';
import type { SystemStatus } from '@shared/types/tutor';

const FAST_POLL_MS = 1500;
const SLOW_POLL_MS = 10_000;

interface StatusState {
  status: SystemStatus | null;
  refresh: () => Promise<void>;
  /** Polls fast while the speech engine is starting or loading models, slowly otherwise. */
  startPolling: () => () => void;
}

export const useStatusStore = create<StatusState>((set, get) => ({
  status: null,

  refresh: async () => {
    try {
      set({ status: await window.tutor.system.status() });
    } catch (err) {
      console.error('Status check failed:', err);
    }
  },

  startPolling: () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const tick = async () => {
      await get().refresh();
      if (stopped) return;
      const s = get().status?.speech;
      const busy = !s || s.process === 'starting' || s.tts === 'loading' || s.stt === 'loading';
      timer = setTimeout(tick, busy ? FAST_POLL_MS : SLOW_POLL_MS);
    };
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  },
}));

/** True once both speech engines have loaded. */
export function useSpeechReady(): boolean {
  return useStatusStore((s) => s.status?.speech.tts === 'ready' && s.status.speech.stt === 'ready');
}

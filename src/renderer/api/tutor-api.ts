import type { TutorAPI } from '@shared/types/ipc';

declare global {
  interface Window {
    tutor: TutorAPI;
  }
}

export {};

import { create } from 'zustand';
import { DEFAULT_CONFIG, type Theme, type TutorConfig } from '@shared/types/config';
import { useStatusStore } from './status';

interface ConfigState {
  config: TutorConfig;
  loaded: boolean;
  loadConfig: () => Promise<void>;
  saveConfig: (config: TutorConfig) => Promise<void>;
  /** Saves one section's fields right away (quick controls such as voice and speed). */
  patch: <K extends keyof TutorConfig>(section: K, values: Partial<TutorConfig[K]>) => Promise<void>;
}

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme === 'system' ? (darkQuery.matches ? 'dark' : 'light') : theme);
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: DEFAULT_CONFIG,
  loaded: false,

  loadConfig: async () => {
    try {
      const config = await window.tutor.config.load();
      set({ config, loaded: true });
      applyTheme(config.general.theme);
    } catch {
      set({ loaded: true });
      applyTheme(DEFAULT_CONFIG.general.theme);
    }
  },

  saveConfig: async (config) => {
    await window.tutor.config.save(config);
    set({ config });
    applyTheme(config.general.theme);
    // Model, host or speech engine may have changed: refresh the status bar now.
    void useStatusStore.getState().refresh();
  },

  patch: async (section, values) => {
    const config = get().config;
    await get().saveConfig({ ...config, [section]: { ...config[section], ...values } });
  },
}));

darkQuery.addEventListener('change', () => applyTheme(useConfigStore.getState().config.general.theme));

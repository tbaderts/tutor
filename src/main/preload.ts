import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { TutorAPI, ViewId } from '../shared/types/ipc';

let askCounter = 0;

const api: TutorAPI = {
  config: {
    load: () => ipcRenderer.invoke('config:load'),
    save: (config) => ipcRenderer.invoke('config:save', config),
  },
  system: {
    status: () => ipcRenderer.invoke('system:status'),
    restartSpeech: () => ipcRenderer.invoke('system:restartSpeech'),
  },
  speech: {
    synthesize: (text, speed) => ipcRenderer.invoke('speech:synthesize', text, speed),
    transcribe: (samples) => ipcRenderer.invoke('speech:transcribe', samples),
  },
  tutor: {
    translate: (text) => ipcRenderer.invoke('tutor:translate', text),
    evaluate: (target, heard, unsure, score) => ipcRenderer.invoke('tutor:evaluate', target, heard, unsure, score),
    checkFree: (heard) => ipcRenderer.invoke('tutor:checkFree', heard),
    ask: (messages, context, onChunk) => {
      const requestId = `ask-${Date.now()}-${++askCounter}`;
      const listener = (_event: IpcRendererEvent, id: string, chunk: string) => {
        if (id === requestId) onChunk(chunk);
      };
      ipcRenderer.on('tutor:chunk', listener);
      return ipcRenderer
        .invoke('tutor:ask', requestId, messages, context)
        .finally(() => ipcRenderer.removeListener('tutor:chunk', listener));
    },
  },
  history: {
    list: () => ipcRenderer.invoke('history:list'),
    add: (entry) => ipcRenderer.invoke('history:add', entry),
    clear: () => ipcRenderer.invoke('history:clear'),
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
    getAppVersion: () => ipcRenderer.invoke('shell:getAppVersion'),
  },
  onNavigate: (listener) => {
    const handler = (_event: IpcRendererEvent, view: ViewId) => listener(view);
    ipcRenderer.on('navigate', handler);
    return () => ipcRenderer.removeListener('navigate', handler);
  },
};

contextBridge.exposeInMainWorld('tutor', api);

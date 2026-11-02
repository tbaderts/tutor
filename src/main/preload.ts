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
    synthesize: (text, options) => ipcRenderer.invoke('speech:synthesize', text, options),
    transcribe: (samples) => ipcRenderer.invoke('speech:transcribe', samples),
  },
  tutor: {
    translate: (text) => ipcRenderer.invoke('tutor:translate', text),
    evaluate: (target, heard, unsure, score, cue) => ipcRenderer.invoke('tutor:evaluate', target, heard, unsure, score, cue),
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
  lessons: {
    catalog: () => ipcRenderer.invoke('lessons:catalog'),
    progress: () => ipcRenderer.invoke('lessons:progress'),
    record: (key, score) => ipcRenderer.invoke('lessons:record', key, score),
    resetProgress: (lessonId) => ipcRenderer.invoke('lessons:resetProgress', lessonId),
    openFolder: () => ipcRenderer.invoke('lessons:openFolder'),
    generate: (request, onProgress) => {
      const requestId = `gen-${Date.now()}-${++askCounter}`;
      const listener = (_event: IpcRendererEvent, id: string, chars: number) => {
        if (id === requestId) onProgress(chars);
      };
      ipcRenderer.on('lessons:generateProgress', listener);
      const result = ipcRenderer
        .invoke('lessons:generate', requestId, request)
        .finally(() => ipcRenderer.removeListener('lessons:generateProgress', listener));
      return { requestId, result };
    },
    cancelGenerate: (requestId) => ipcRenderer.invoke('lessons:cancelGenerate', requestId),
    save: (draft) => ipcRenderer.invoke('lessons:save', draft),
    delete: (lessonId) => ipcRenderer.invoke('lessons:delete', lessonId),
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

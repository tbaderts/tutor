import { app, BrowserWindow, ipcMain, session } from 'electron';
import * as path from 'path';
import { ConfigService } from './services/ConfigService';
import { HistoryService } from './services/HistoryService';
import { OllamaService } from './services/OllamaService';
import { SpeechService, type SpeechSettings } from './services/SpeechService';
import { registerConfigIpc } from './ipc/config.ipc';
import { registerSystemIpc } from './ipc/system.ipc';
import { registerSpeechIpc } from './ipc/speech.ipc';
import { registerTutorIpc } from './ipc/tutor.ipc';
import { registerHistoryIpc } from './ipc/history.ipc';
import { registerShellIpc } from './ipc/shell.ipc';
import { createApplicationMenu } from './menu';
import type { TutorConfig } from '../shared/types/config';

let mainWindow: BrowserWindow | null = null;
let configService: ConfigService;
let ollama: OllamaService;
let speech: SpeechService;
let history: HistoryService;

const isDev = process.env.DEV_SERVER === 'true';

/** The sidecar script ships as an extra resource; in development it is read from the repo. */
const speechScript = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, 'python', 'speech_server.py')
    : path.join(app.getAppPath(), 'python', 'speech_server.py');

function speechSettings(): SpeechSettings {
  const { speech: s } = configService.getConfig();
  return { pythonPath: s.pythonPath, modelsDir: configService.getModelsDir(), whisperModel: s.whisperModel, whisperDevice: s.whisperDevice };
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 860,
    minWidth: 800,
    minHeight: 560,
    title: 'Tutor',
    // The menu bar stays out of the way: Alt shows it, and its shortcuts work while it is hidden.
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  if (isDev) {
    await mainWindow.loadURL('http://localhost:5190');
    if (process.env.TUTOR_DEVTOOLS === '1') mainWindow.webContents.openDevTools({ mode: 'bottom' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/** The microphone is the only permission the page needs. */
function allowMicrophone(): void {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => callback(permission === 'media'));
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media');
}

function onConfigSaved(previous: TutorConfig, config: TutorConfig): void {
  if (previous.llm.host !== config.llm.host || previous.llm.model !== config.llm.model) ollama.invalidateStatus();
  const p = previous.speech;
  const s = config.speech;
  if (p.pythonPath !== s.pythonPath || p.modelsDir !== s.modelsDir) {
    void speech.start(speechSettings());
  } else if (p.whisperModel !== s.whisperModel || p.whisperDevice !== s.whisperDevice) {
    speech.configure(speechSettings()).catch((err) => console.error('[speech] reconfigure failed:', err));
  }
}

app.whenReady().then(async () => {
  configService = new ConfigService();
  await configService.load();
  ollama = new OllamaService(() => configService.getConfig().llm);
  speech = new SpeechService(speechScript());
  history = new HistoryService(configService.getConfigDir());

  registerConfigIpc(ipcMain, configService, onConfigSaved);
  registerSystemIpc(ipcMain, ollama, speech, () => speech.start(speechSettings()));
  registerSpeechIpc(ipcMain, configService, speech, speechSettings);
  registerTutorIpc(ipcMain, configService, ollama);
  registerHistoryIpc(ipcMain, history);
  registerShellIpc(ipcMain);
  allowMicrophone();
  createApplicationMenu();

  // Models load in the background; the status bar shows progress.
  void speech.start(speechSettings());
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  speech?.stop();
  if (process.platform !== 'darwin') app.quit();
});

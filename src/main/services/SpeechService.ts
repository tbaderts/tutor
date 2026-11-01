import { spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { SpeechStatus, Transcript } from '../../shared/types/tutor';

export interface SpeechSettings {
  pythonPath: string;
  modelsDir: string;
  whisperModel: string;
  whisperDevice: string;
}

const STARTUP_TIMEOUT_MS = 60_000;
const TTS_CACHE_SIZE = 200;

/**
 * Interpreters to try when none is configured: TUTOR_PYTHON, then the conda envs the prototype
 * used, then whatever `python` is on PATH.
 */
export function pythonCandidates(configured: string, env: NodeJS.ProcessEnv = process.env): string[] {
  if (configured.trim()) return [configured.trim()];
  const home = os.homedir();
  const exe = process.platform === 'win32' ? 'python.exe' : path.join('bin', 'python');
  const condaEnvs = ['tutor', 'italian'].flatMap((name) => [
    path.join(home, 'miniconda3', 'envs', name, exe),
    path.join(home, 'anaconda3', 'envs', name, exe),
  ]);
  return [env.TUTOR_PYTHON ?? '', ...condaEnvs.filter((p) => fs.existsSync(p)), process.platform === 'win32' ? 'python' : 'python3'].filter(Boolean);
}

/**
 * Runs python/speech_server.py (Kokoro TTS + faster-whisper STT) as a child process and talks to it
 * over HTTP on 127.0.0.1. The sidecar exits on its own when our end of its stdin closes.
 */
export class SpeechService {
  private child: ChildProcess | null = null;
  private port = 0;
  private state: SpeechStatus['process'] = 'stopped';
  private error: string | null = null;
  private python = '';
  private stderrTail: string[] = [];
  private ttsCache = new Map<string, Uint8Array>();

  constructor(private scriptPath: string) {}

  async start(settings: SpeechSettings): Promise<void> {
    this.stop();
    this.state = 'starting';
    this.error = null;
    const failures: string[] = [];
    for (const python of pythonCandidates(settings.pythonPath)) {
      try {
        await this.spawn(python, settings.modelsDir);
        this.python = python;
        this.state = 'running';
        await this.configure(settings);
        return;
      } catch (err) {
        failures.push(`${python}: ${(err as Error).message}`);
        this.stop();
      }
    }
    this.state = 'error';
    this.error = `Could not start the speech engine.\n${failures.join('\n')}`;
    console.error('[speech]', this.error);
  }

  /** Loads the models for the given Whisper settings in the background. */
  async configure(settings: SpeechSettings): Promise<void> {
    await this.request('/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whisper: settings.whisperModel, device: settings.whisperDevice }),
    });
  }

  stop(): void {
    if (this.child) {
      this.child.removeAllListeners('exit');
      this.child.stdin?.end();
      this.child.kill();
      this.child = null;
    }
    this.port = 0;
    this.state = 'stopped';
  }

  async status(): Promise<SpeechStatus> {
    const base: SpeechStatus = { process: this.state, tts: 'idle', stt: 'idle', error: this.error, python: this.python };
    if (this.state !== 'running') return base;
    try {
      const res = await this.request('/status', { signal: AbortSignal.timeout(2000) });
      const s = (await res.json()) as {
        tts: SpeechStatus['tts']; ttsError: string | null; stt: SpeechStatus['stt']; sttError: string | null;
        sttDevice: string | null; sttModel: string | null; download: SpeechStatus['download'];
      };
      return {
        ...base,
        tts: s.tts,
        stt: s.stt,
        sttDevice: s.sttDevice,
        sttModel: s.sttModel,
        download: s.download,
        error: [s.ttsError && `Text-to-speech: ${s.ttsError}`, s.sttError && `Speech recognition: ${s.sttError}`].filter(Boolean).join('\n') || null,
      };
    } catch (err) {
      return { ...base, error: (err as Error).message };
    }
  }

  async synthesize(text: string, voice: string, speed: number, lang: string): Promise<Uint8Array> {
    const key = JSON.stringify([text, voice, speed, lang]);
    const cached = this.ttsCache.get(key);
    if (cached) return cached;
    const res = await this.request('/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed, lang }),
    });
    const wav = new Uint8Array(await res.arrayBuffer());
    if (this.ttsCache.size >= TTS_CACHE_SIZE) this.ttsCache.delete(this.ttsCache.keys().next().value!);
    this.ttsCache.set(key, wav);
    return wav;
  }

  async transcribe(samples: Float32Array, lang: string, settings: SpeechSettings): Promise<Transcript> {
    const query = new URLSearchParams({ lang, whisper: settings.whisperModel, device: settings.whisperDevice });
    const res = await this.request(`/stt?${query}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      // A copy owns exactly these samples; the IPC array may be a view into a larger buffer.
      body: new Float32Array(samples).buffer,
    });
    return (await res.json()) as Transcript;
  }

  private async request(p: string, init: RequestInit = {}): Promise<Response> {
    if (this.state !== 'running') {
      throw new Error(this.error ?? 'The speech engine is not running. Check Settings → Speech.');
    }
    const res = await fetch(`http://127.0.0.1:${this.port}${p}`, init);
    if (!res.ok) {
      const body = await res.text();
      let message = body;
      try {
        message = (JSON.parse(body) as { error?: string }).error ?? body;
      } catch {
        // plain-text error
      }
      throw new Error(`Speech engine: ${message}`);
    }
    return res;
  }

  private spawn(python: string, modelsDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(python, ['-u', this.scriptPath, '--port', '0', '--models', modelsDir], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' },
        windowsHide: true,
      });
      this.child = child;
      this.stderrTail = [];
      const timer = setTimeout(() => reject(new Error('timed out waiting for the speech engine to start')), STARTUP_TIMEOUT_MS);
      let stdout = '';

      child.stdout!.on('data', (data: Buffer) => {
        stdout += data.toString();
        const match = /READY (\d+)/.exec(stdout);
        if (match && !this.port) {
          this.port = Number(match[1]);
          clearTimeout(timer);
          resolve();
        }
      });
      child.stderr!.on('data', (data: Buffer) => {
        const lines = data.toString().split(/\r?\n/).filter(Boolean);
        lines.forEach((l) => console.log('[speech]', l));
        this.stderrTail = [...this.stderrTail, ...lines].slice(-20);
      });
      child.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
      child.on('exit', (code) => {
        clearTimeout(timer);
        const tail = this.stderrTail.slice(-6).join('\n');
        if (!this.port) {
          reject(new Error(`exited with code ${code}${tail ? `\n${tail}` : ''}`));
        } else if (this.child === child) {
          this.state = 'error';
          this.error = `The speech engine stopped (code ${code}).${tail ? `\n${tail}` : ''}`;
          this.child = null;
        }
      });
    });
  }
}

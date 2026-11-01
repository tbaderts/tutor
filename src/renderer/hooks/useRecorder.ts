import { useCallback, useEffect, useRef, useState } from 'react';
import { decodeTo16kMono, MIN_RECORDING_SECONDS, SAMPLE_RATE, stopPlayback } from '@/lib/audio';

interface Session {
  stream: MediaStream;
  recorder: MediaRecorder;
  chunks: Blob[];
  ctx: AudioContext;
  frame: number;
  startedAt: number;
}

export interface Recorder {
  recording: boolean;
  /** Seconds since recording started. */
  elapsed: number;
  /** Input level 0-1, for a meter. */
  level: number;
  error: string | null;
  start: () => Promise<void>;
  /** Stops and returns 16 kHz mono samples, or null if the recording was too short. */
  stop: () => Promise<Float32Array | null>;
}

/** Records from the default microphone through Chromium (no Python audio stack involved). */
export function useRecorder(): Recorder {
  const session = useRef<Session | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const release = useCallback((s: Session) => {
    cancelAnimationFrame(s.frame);
    s.stream.getTracks().forEach((t) => t.stop());
    void s.ctx.close();
    setRecording(false);
    setLevel(0);
  }, []);

  useEffect(() => () => {
    const s = session.current;
    if (s) {
      if (s.recorder.state !== 'inactive') s.recorder.stop();
      release(s);
    }
  }, [release]);

  const start = useCallback(async () => {
    if (session.current) return;
    setError(null);
    stopPlayback(); // don't record the teacher's voice
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      setError(
        `Could not open the microphone: ${(err as Error).message}. ` +
          "Check Windows Settings → Privacy & security → Microphone → 'Let desktop apps access your microphone'.",
      );
      return;
    }
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Float32Array(analyser.fftSize);

    const s: Session = { stream, recorder, chunks, ctx, frame: 0, startedAt: performance.now() };
    const meter = () => {
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += v * v;
      setLevel(Math.min(1, Math.sqrt(sum / data.length) * 6));
      setElapsed((performance.now() - s.startedAt) / 1000);
      s.frame = requestAnimationFrame(meter);
    };
    s.frame = requestAnimationFrame(meter);

    recorder.start();
    session.current = s;
    setElapsed(0);
    setRecording(true);
  }, []);

  const stop = useCallback(async () => {
    const s = session.current;
    if (!s) return null;
    session.current = null;
    const stopped = new Promise<void>((resolve) => (s.recorder.onstop = () => resolve()));
    s.recorder.stop();
    await stopped;
    release(s);
    const samples = await decodeTo16kMono(new Blob(s.chunks, { type: s.recorder.mimeType }));
    if (samples.length < SAMPLE_RATE * MIN_RECORDING_SECONDS) {
      setError('Recording too short — try again.');
      return null;
    }
    return samples;
  }, [release]);

  return { recording, elapsed, level, error, start, stop };
}

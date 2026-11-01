/** Whisper's input format. */
export const SAMPLE_RATE = 16_000;
/** Shorter recordings are almost always an accidental click. */
export const MIN_RECORDING_SECONDS = 0.3;

/** Decodes a recording (webm/opus from MediaRecorder) to 16 kHz mono float samples. */
export async function decodeTo16kMono(blob: Blob): Promise<Float32Array> {
  // An AudioContext at 16 kHz resamples while decoding.
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  try {
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    if (buffer.numberOfChannels === 1) return buffer.getChannelData(0).slice();
    const mono = new Float32Array(buffer.length);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) mono[i] += data[i] / buffer.numberOfChannels;
    }
    return mono;
  } finally {
    void ctx.close();
  }
}

let current: { audio: HTMLAudioElement; done: () => void } | null = null;

/** Stops whatever is playing; its `playWav` promise resolves. */
export function stopPlayback(): void {
  if (!current) return;
  current.audio.pause();
  current.done();
}

/** Plays WAV bytes, replacing anything already playing. Resolves when playback ends or is stopped. */
export function playWav(bytes: Uint8Array): Promise<void> {
  stopPlayback();
  const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'audio/wav' }));
  const audio = new Audio(url);
  return new Promise<void>((resolve, reject) => {
    const entry = {
      audio,
      done: () => {
        URL.revokeObjectURL(url);
        if (current === entry) current = null;
        resolve();
      },
    };
    current = entry;
    audio.onended = entry.done;
    audio.onerror = () => {
      entry.done();
      reject(new Error('Could not play the audio.'));
    };
    audio.play().catch((err) => {
      entry.done();
      reject(err);
    });
  });
}

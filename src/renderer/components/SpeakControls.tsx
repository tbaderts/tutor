import React, { useState } from 'react';
import { Loader2, Mic, Square, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, errorMessage } from '@/lib/utils';
import { playWav } from '@/lib/audio';
import { useRecorder } from '@/hooks/useRecorder';
import { useSpeechReady } from '@/stores/status';

/** Speaks a sentence in the target language; `voice` overrides the configured one (dialogue speakers). */
export async function speak(text: string, voice?: string): Promise<void> {
  await playWav(await window.tutor.speech.synthesize(text, { voice }));
}

/** Small play button for a word or sentence. */
export function PlayButton({ text, voice, className }: { text: string; voice?: string; className?: string }) {
  const ready = useSpeechReady();
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8', className)}
      title={error ?? 'Listen'}
      disabled={!ready}
      onClick={async () => {
        setPlaying(true);
        setError(null);
        try {
          await speak(text, voice);
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setPlaying(false);
        }
      }}
    >
      <Volume2 className={cn('h-4 w-4', playing && 'animate-pulse text-primary', error && 'text-destructive')} />
    </Button>
  );
}

/** Small record button for lists: click to start, click to stop. */
export function MiniRecorder({ onRecorded, busy }: { onRecorded: (samples: Float32Array) => void; busy?: boolean }) {
  const ready = useSpeechReady();
  const { recording, level, error, start, stop } = useRecorder();
  return (
    <div className="flex items-center gap-2">
      {error && <span className="max-w-48 text-xs text-warning">{error}</span>}
      <Button
        variant={recording ? 'destructive' : 'outline'}
        size="icon"
        className="relative h-8 w-8"
        title={recording ? 'Stop recording' : 'Say it'}
        aria-label={recording ? 'Stop recording' : 'Say it'}
        disabled={!recording && (!ready || busy)}
        onClick={async () => {
          if (!recording) return start();
          const samples = await stop();
          if (samples) onRecorded(samples);
        }}
      >
        {recording && (
          <span className="absolute inset-0 rounded-md bg-destructive/40" style={{ transform: `scale(${1 + level * 0.3})` }} />
        )}
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : recording ? (
          <Square className="relative h-3.5 w-3.5 fill-current" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

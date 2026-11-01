import React, { useEffect } from 'react';
import { Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecorder } from '@/hooks/useRecorder';

interface RecordButtonProps {
  onRecorded: (samples: Float32Array) => void;
  disabled?: boolean;
  /** Space starts and stops recording while focus is not in a text field or on a button. */
  spaceHotkey?: boolean;
}

/** One button to start and stop recording, with a level meter and timer while it runs. */
export function RecordButton({ onRecorded, disabled, spaceHotkey }: RecordButtonProps) {
  const { recording, elapsed, level, error, start, stop } = useRecorder();

  const toggle = async () => {
    if (recording) {
      const samples = await stop();
      if (samples) onRecorded(samples);
    } else if (!disabled) {
      await start();
    }
  };

  useEffect(() => {
    if (!spaceHotkey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, button, select, [role="combobox"], [role="tab"]')) return;
      e.preventDefault();
      void toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={toggle}
        disabled={disabled && !recording}
        aria-label={recording ? 'Stop recording' : 'Start recording'}
        className={cn(
          'relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition-all',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40',
          'disabled:cursor-not-allowed disabled:opacity-40',
          recording ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:scale-105 hover:bg-primary/90',
        )}
      >
        {recording && (
          <span
            className="absolute inset-0 rounded-full bg-destructive/40"
            style={{ transform: `scale(${1 + level * 0.25})`, transition: 'transform 80ms linear' }}
          />
        )}
        {recording ? <Square className="relative h-7 w-7 fill-current" /> : <Mic className="relative h-8 w-8" />}
      </button>
      <div className="h-5 text-sm text-muted-foreground">
        {recording ? (
          <span className="font-medium text-destructive">● Recording {elapsed.toFixed(1)}s — click to stop</span>
        ) : (
          <span>Click to record{spaceHotkey ? ' · or press Space' : ''}</span>
        )}
      </div>
      {error && <div className="max-w-md text-center text-sm text-warning">{error}</div>}
    </div>
  );
}

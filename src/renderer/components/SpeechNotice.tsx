import React from 'react';
import { Loader2 } from 'lucide-react';
import { useStatusStore } from '@/stores/status';
import { useNavigationStore } from '@/stores/navigation';
import { ErrorAlert } from './PageHeader';

/** Explains why recording or playback isn't available yet: engine starting, models loading, or an error. */
export function SpeechNotice() {
  const speech = useStatusStore((s) => s.status?.speech);
  const setActiveView = useNavigationStore((s) => s.setActiveView);
  if (!speech) return null;

  const failed = speech.process === 'error' || speech.tts === 'error' || speech.stt === 'error';
  if (failed) {
    return (
      <ErrorAlert>
        {speech.error ?? 'The speech engine failed.'}
        {'\n'}
        <button className="font-medium underline" onClick={() => setActiveView('settings')}>
          Open Settings → Speech
        </button>
      </ErrorAlert>
    );
  }
  if (speech.tts === 'ready' && speech.stt === 'ready') return null;

  const text = speech.download
    ? `Downloading ${speech.download.file} (one-time): ${speech.download.percent}%`
    : speech.process === 'starting'
      ? 'Starting the speech engine…'
      : 'Loading speech models… the first start takes a little while.';
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted px-4 py-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {text}
    </div>
  );
}

import React from 'react';
import { cn } from '@/lib/utils';
import { useConfigStore } from '@/stores/config';
import { useStatusStore } from '@/stores/status';
import { useNavigationStore } from '@/stores/navigation';
import { nativeLanguageName, targetLanguage } from '@shared/languages';
import type { SpeechStatus } from '@shared/types/tutor';

type Tone = 'ok' | 'busy' | 'error' | 'unknown';

const DOT: Record<Tone, string> = {
  ok: 'bg-success',
  busy: 'bg-warning animate-pulse',
  error: 'bg-destructive',
  unknown: 'bg-muted-foreground',
};

function speechSummary(s: SpeechStatus | undefined): { tone: Tone; text: string } {
  if (!s) return { tone: 'unknown', text: 'Speech: checking…' };
  if (s.process === 'error' || s.tts === 'error' || s.stt === 'error') return { tone: 'error', text: 'Speech: error' };
  if (s.process === 'stopped') return { tone: 'unknown', text: 'Speech: stopped' };
  if (s.process === 'starting') return { tone: 'busy', text: 'Speech: starting…' };
  if (s.download) return { tone: 'busy', text: `Downloading ${s.download.file} ${s.download.percent}%` };
  if (s.tts !== 'ready' || s.stt !== 'ready') return { tone: 'busy', text: 'Speech: loading models…' };
  return { tone: 'ok', text: `Whisper ${s.sttModel} · ${s.sttDevice}` };
}

export function StatusBar() {
  const status = useStatusStore((s) => s.status);
  const { general, llm } = useConfigStore((s) => s.config);
  const setActiveView = useNavigationStore((s) => s.setActiveView);
  const speech = speechSummary(status?.speech);
  const llmTone: Tone = !status ? 'unknown' : status.llm.ok ? 'ok' : 'error';

  return (
    <footer className="flex h-6 items-center justify-between gap-4 border-t border-border bg-muted px-3 text-xs text-muted-foreground">
      <div className="flex min-w-0 items-center gap-4">
        <button
          className="flex shrink-0 items-center gap-2 rounded px-1 hover:bg-accent"
          title={status?.llm.error ?? `Ollama at ${llm.host}`}
          onClick={() => setActiveView('settings')}
        >
          <span className={cn('inline-block h-2 w-2 rounded-full', DOT[llmTone])} />
          <span>Ollama · {llm.model}</span>
        </button>
        <button
          className="flex min-w-0 items-center gap-2 rounded px-1 hover:bg-accent"
          title={status?.speech.error ?? status?.speech.python ?? ''}
          onClick={() => setActiveView('settings')}
        >
          <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', DOT[speech.tone])} />
          <span className="truncate">{speech.text}</span>
        </button>
      </div>
      <div className="flex min-w-0 items-center gap-4">
        <span className="truncate">
          {nativeLanguageName(general.nativeLanguage)} → {targetLanguage(general.targetLanguage).name}
        </span>
      </div>
    </footer>
  );
}

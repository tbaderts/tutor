import React, { useMemo, useState } from 'react';
import { Languages, Loader2, RotateCcw, Snail, Volume2, Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader, ErrorAlert } from '@/components/PageHeader';
import { RecordButton } from '@/components/RecordButton';
import { SentenceDiff, ScoreMeter, VerdictBanner } from '@/components/Feedback';
import { SpeechNotice } from '@/components/SpeechNotice';
import { cn } from '@/lib/utils';
import { useConfigStore } from '@/stores/config';
import { usePracticeStore } from '@/stores/practice';
import { useHistoryStore } from '@/stores/history';
import { useSpeechReady } from '@/stores/status';
import { NATIVE_LANGUAGES, nativeLanguageName, targetLanguage, voiceFor } from '@shared/languages';

const SLOW_SPEED = 0.75;
const SPEEDS = [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2];

export function PracticeView() {
  const target = targetLanguage(useConfigStore((s) => s.config.general.targetLanguage));
  const hasSentence = usePracticeStore((s) => !!s.target);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <PageHeader
        title="Practice"
        description={`Type a sentence, hear it in ${target.name}, then say it back.`}
        actions={<VoiceControls />}
      />
      <SpeechNotice />
      <SentenceInput />
      <CurrentSentence />
      {!hasSentence && <RecentSentences />}
    </div>
  );
}

/** Voice and speed change often while practising, so they save immediately. */
function VoiceControls() {
  const { general, speech } = useConfigStore((s) => s.config);
  const patch = useConfigStore((s) => s.patch);
  const voices = targetLanguage(general.targetLanguage).voices;
  return (
    <>
      <Select value={voiceFor(general.targetLanguage, speech.voice)} onValueChange={(voice) => patch('speech', { voice })}>
        <SelectTrigger className="w-40" aria-label="Voice">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {voices.map((v) => (
            <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(speech.speed)} onValueChange={(v) => patch('speech', { speed: Number(v) })}>
        <SelectTrigger className="w-24" aria-label="Speaking speed">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SPEEDS.map((s) => (
            <SelectItem key={s} value={String(s)}>{s.toFixed(1)}×</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}

function SentenceInput() {
  const { nativeLanguage, targetLanguage: targetId } = useConfigStore((s) => s.config.general);
  const { submit, busy } = usePracticeStore();
  const [text, setText] = useState('');
  const [translate, setTranslate] = useState(true);
  const native = nativeLanguageName(nativeLanguage);
  const target = targetLanguage(targetId).name;
  const placeholder = (NATIVE_LANGUAGES as Record<string, { placeholder: string }>)[nativeLanguage]?.placeholder;

  const go = async () => {
    if (!text.trim()) return;
    await submit(text, translate);
    setText('');
  };

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="inline-flex rounded-lg bg-muted p-1 text-sm">
          {[
            { value: true, label: `${native} → translate` },
            { value: false, label: `${target} as is` },
          ].map((o) => (
            <button
              key={String(o.value)}
              onClick={() => setTranslate(o.value)}
              className={cn(
                'rounded-md px-3 py-1 font-medium text-muted-foreground transition-all',
                translate === o.value && 'bg-background text-foreground shadow',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void go();
          }}
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={translate ? placeholder : `Type ${target} here`}
            className="h-10 text-base"
            autoFocus
          />
          <Button type="submit" className="h-10" disabled={!text.trim() || busy === 'translating'}>
            {busy === 'translating' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Volume2 className="mr-2 h-4 w-4" />}
            Speak it in {target}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CurrentSentence() {
  const { target, source, busy, playing, attempt, error, play, assess, retry } = usePracticeStore();
  const speechReady = useSpeechReady();
  if (!target) return error ? <ErrorAlert>{error}</ErrorAlert> : null;

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-3xl font-semibold leading-snug">{target}</div>
            {source && (
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Languages className="h-3.5 w-3.5" />
                {source}
              </div>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="icon" title="Play again" disabled={!speechReady || playing} onClick={() => play()}>
              <Volume2 className={cn('h-4 w-4', playing && 'animate-pulse text-primary')} />
            </Button>
            <Button variant="outline" size="icon" title="Play slowly" disabled={!speechReady || playing} onClick={() => play(SLOW_SPEED)}>
              <Snail className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="mb-6 text-center text-sm font-medium">Now you say it</div>
          <RecordButton onRecorded={assess} disabled={!speechReady || busy !== null} spaceHotkey />
        </div>

        {busy && busy !== 'translating' && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {busy === 'listening' ? 'Listening…' : 'Checking…'}
          </div>
        )}
        {error && <ErrorAlert>{error}</ErrorAlert>}

        {attempt && (
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-start justify-between gap-6">
              <SentenceDiff ops={attempt.diff.ops} />
              <ScoreMeter score={attempt.diff.score} />
            </div>
            {attempt.evaluation && (
              <>
                <VerdictBanner verdict={attempt.evaluation.verdict}>{attempt.evaluation.feedback}</VerdictBanner>
                {attempt.evaluation.tip && (
                  <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {attempt.evaluation.tip}
                  </div>
                )}
              </>
            )}
            {attempt.unsure.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Unclear words (low recognizer confidence): {attempt.unsure.join(', ')}
              </div>
            )}
            {attempt.evaluation && (
              <Button variant="outline" size="sm" onClick={retry}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Try again
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Before a sentence is chosen: the latest distinct sentences in this language, one click to practise again. */
function RecentSentences() {
  const entries = useHistoryStore((s) => s.entries);
  const targetId = useConfigStore((s) => s.config.general.targetLanguage);
  const setTarget = usePracticeStore((s) => s.setTarget);
  const recent = useMemo(() => {
    const seen = new Set<string>();
    return entries
      .filter((e) => e.targetLanguage === targetId && !seen.has(e.target) && seen.add(e.target))
      .slice(0, 6);
  }, [entries, targetId]);

  if (!recent.length) {
    return <p className="text-center text-sm text-muted-foreground">Type a sentence above to start.</p>;
  }
  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Practise again</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {recent.map((e) => (
          <button
            key={e.id}
            onClick={() => setTarget(e.target, e.source ?? null)}
            className="rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent"
          >
            <div className="font-medium">{e.target}</div>
            {e.source && <div className="truncate text-xs text-muted-foreground">{e.source}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

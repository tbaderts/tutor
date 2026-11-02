import React, { useMemo, useRef, useState } from 'react';
import { Eye, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorAlert } from '@/components/PageHeader';
import { HeardWords } from '@/components/Feedback';
import { MiniRecorder, PlayButton, speak } from '@/components/SpeakControls';
import { cn, errorMessage } from '@/lib/utils';
import { stopPlayback } from '@/lib/audio';
import { useConfigStore } from '@/stores/config';
import { useSpeechReady } from '@/stores/status';
import { itemKey, LEARNER } from '@shared/lessons';
import { targetLanguage, voiceFor, voiceGender } from '@shared/languages';
import type { Dialogue, DialogueLine, Lesson } from '@shared/types/lessons';
import { ProgressMark } from './ItemList';
import { useAttempt } from './useAttempt';

/** A voice per speaker: the learner keeps the configured voice, others get one of their gender, different if possible. */
function useSpeakerVoices(dialogue: Dialogue): Record<string, string> {
  const { general, speech } = useConfigStore((s) => s.config);
  return useMemo(() => {
    const voices = targetLanguage(general.targetLanguage).voices.map((v) => v.id);
    const mine = voiceFor(general.targetLanguage, speech.voice);
    const result: Record<string, string> = { [LEARNER]: mine };
    for (const line of dialogue.lines) {
      if (result[line.speaker]) continue;
      const gender = dialogue.speakers?.[line.speaker];
      const candidates = voices.filter((v) => v !== mine && (!gender || voiceGender(v) === gender));
      result[line.speaker] = candidates[0] ?? voices.find((v) => v !== mine) ?? mine;
    }
    return result;
  }, [dialogue, general.targetLanguage, speech.voice]);
}

export function DialoguePanel({ lesson, dialogue }: { lesson: Lesson; dialogue: Dialogue }) {
  const [rolePlay, setRolePlay] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopped = useRef(false);
  const voices = useSpeakerVoices(dialogue);
  const ready = useSpeechReady();

  const playAll = async () => {
    stopped.current = false;
    setError(null);
    try {
      for (let i = 0; i < dialogue.lines.length && !stopped.current; i++) {
        const line = dialogue.lines[i];
        // In role-play the learner's lines are theirs to say: leave a pause instead.
        if (rolePlay && line.speaker === LEARNER) continue;
        setCurrent(i);
        await speak(line.text, voices[line.speaker]);
        await new Promise((r) => setTimeout(r, 350));
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCurrent(null);
    }
  };

  const stop = () => {
    stopped.current = true;
    stopPlayback();
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold">{dialogue.title}</div>
            <div className="text-xs text-muted-foreground">
              {rolePlay ? 'Your lines are hidden: say them, then check.' : 'Listen and read along, then switch to role-play.'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-muted p-1 text-sm">
              {[
                { value: false, label: 'Listen' },
                { value: true, label: 'Role-play' },
              ].map((o) => (
                <button
                  key={o.label}
                  onClick={() => setRolePlay(o.value)}
                  className={cn('rounded-md px-3 py-1 font-medium text-muted-foreground', rolePlay === o.value && 'bg-background text-foreground shadow')}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {current === null ? (
              <Button size="sm" onClick={playAll} disabled={!ready}>
                <Play className="mr-2 h-4 w-4" />
                Play
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={stop}>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            )}
          </div>
        </div>
        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="space-y-3">
          {dialogue.lines.map((line, i) => (
            <LineBubble
              key={i}
              lesson={lesson}
              line={line}
              voice={voices[line.speaker]}
              active={current === i}
              rolePlay={rolePlay}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface LineBubbleProps {
  lesson: Lesson;
  line: DialogueLine;
  voice: string;
  active: boolean;
  rolePlay: boolean;
}

function LineBubble({ lesson, line, voice, active, rolePlay }: LineBubbleProps) {
  const mine = line.speaker === LEARNER;
  const key = itemKey(lesson.id, 'dialogue', line.text);
  const { busy, result, error, assess } = useAttempt(key, [line.text], { lessonId: lesson.id, history: true });
  const [revealed, setRevealed] = useState(false);
  const hidden = rolePlay && mine && !revealed && !result;

  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] space-y-1 rounded-xl border px-4 py-2.5 transition-shadow',
          mine ? 'border-primary/30 bg-primary/5' : 'bg-card',
          active && 'ring-2 ring-primary',
        )}
      >
        <div className="text-xs font-medium text-muted-foreground">{mine ? 'You' : line.speaker}</div>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {hidden ? (
              <div className="text-base italic text-muted-foreground">Say: “{line.en}”</div>
            ) : (
              <>
                <div className="text-base font-medium">{line.text}</div>
                <div className="text-sm text-muted-foreground">{line.en}</div>
              </>
            )}
          </div>
          {mine && <ProgressMark progressKey={key} />}
          {hidden ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Show the line" onClick={() => setRevealed(true)}>
              <Eye className="h-4 w-4" />
            </Button>
          ) : (
            <PlayButton text={line.text} voice={voice} />
          )}
          {mine && <MiniRecorder onRecorded={assess} busy={busy !== null} />}
        </div>
        {result && <HeardWords ops={result.diff.ops} score={result.diff.score} />}
        {error && <div className="text-xs text-destructive">{error}</div>}
      </div>
    </div>
  );
}

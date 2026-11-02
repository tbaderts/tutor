import React, { useEffect, useState } from 'react';
import { ArrowRight, Eye, Lightbulb, Loader2, RotateCcw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorAlert } from '@/components/PageHeader';
import { RecordButton } from '@/components/RecordButton';
import { HeardWords, VerdictBanner } from '@/components/Feedback';
import { PlayButton } from '@/components/SpeakControls';
import { cn } from '@/lib/utils';
import { useConfigStore } from '@/stores/config';
import { useSpeechReady } from '@/stores/status';
import { itemKey } from '@shared/lessons';
import { targetLanguage } from '@shared/languages';
import type { Lesson, LessonItem } from '@shared/types/lessons';
import type { Verdict } from '@shared/types/tutor';
import { useAttempt } from './useAttempt';

/** English cues one by one; the learner answers from memory and the teacher judges the meaning. */
export function ChallengePanel({ lesson }: { lesson: Lesson }) {
  const [index, setIndex] = useState(0);
  const [verdicts, setVerdicts] = useState<(Verdict | null)[]>(() => lesson.challenge.map(() => null));
  const done = index >= lesson.challenge.length;

  const restart = () => {
    setIndex(0);
    setVerdicts(lesson.challenge.map(() => null));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2">
        {lesson.challenge.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            title={`Question ${i + 1}`}
            className={cn(
              'h-2.5 w-8 rounded-full transition-colors',
              verdicts[i] === 'correct' ? 'bg-success' : verdicts[i] === 'almost' ? 'bg-warning' : verdicts[i] ? 'bg-destructive' : 'bg-muted',
              i === index && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
            )}
          />
        ))}
      </div>

      {done ? (
        <Summary verdicts={verdicts} onRestart={restart} />
      ) : (
        <ChallengeCard
          key={index}
          lesson={lesson}
          item={lesson.challenge[index]}
          number={index + 1}
          onVerdict={(v) => setVerdicts((all) => all.map((old, i) => (i === index ? v : old)))}
          onNext={() => setIndex(index + 1)}
        />
      )}
    </div>
  );
}

interface ChallengeCardProps {
  lesson: Lesson;
  item: LessonItem;
  number: number;
  onVerdict: (v: Verdict) => void;
  onNext: () => void;
}

function ChallengeCard({ lesson, item, number, onVerdict, onNext }: ChallengeCardProps) {
  const targetName = targetLanguage(useConfigStore((s) => s.config.general.targetLanguage)).name;
  const ready = useSpeechReady();
  const [showAnswer, setShowAnswer] = useState(false);
  const { busy, result, error, assess, reset } = useAttempt(
    itemKey(lesson.id, 'challenge', item.text),
    [item.text, ...(item.accept ?? [])],
    { lessonId: lesson.id, cue: item.en, history: true },
  );
  const evaluation = result?.evaluation;

  // Report the verdict to the progress dots once the teacher has answered.
  useEffect(() => {
    if (evaluation) onVerdict(evaluation.verdict);
  }, [evaluation]);

  return (
    <Card>
      <CardContent className="space-y-6 pt-6 text-center">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {number} · Say it in {targetName}
          </div>
          <div className="mt-2 text-2xl font-semibold">{item.en}</div>
        </div>

        {!result && !busy && (
          <RecordButton onRecorded={assess} disabled={!ready} spaceHotkey />
        )}
        {busy && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {busy === 'listening' ? 'Listening…' : 'The teacher is checking…'}
          </div>
        )}
        {error && <ErrorAlert>{error}</ErrorAlert>}

        {(showAnswer || evaluation) && (
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl font-medium text-primary">{result?.expected ?? item.text}</span>
            <PlayButton text={result?.expected ?? item.text} />
          </div>
        )}

        {result && (
          <div className="space-y-3 text-left">
            <HeardWords ops={result.diff.ops} score={result.diff.score} />
            {evaluation && <VerdictBanner verdict={evaluation.verdict}>{evaluation.feedback}</VerdictBanner>}
            {evaluation?.tip && (
              <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {evaluation.tip}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-center gap-2">
          {!result && !showAnswer && !busy && (
            <Button variant="ghost" size="sm" onClick={() => setShowAnswer(true)}>
              <Eye className="mr-2 h-4 w-4" />
              Show answer
            </Button>
          )}
          {result && !busy && (
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          )}
          {(evaluation || showAnswer || error) && !busy && (
            <Button size="sm" onClick={onNext}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Summary({ verdicts, onRestart }: { verdicts: (Verdict | null)[]; onRestart: () => void }) {
  const correct = verdicts.filter((v) => v === 'correct').length;
  const almost = verdicts.filter((v) => v === 'almost').length;
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <Trophy className={cn('h-10 w-10', correct === verdicts.length ? 'text-success' : 'text-warning')} />
        <div className="text-xl font-semibold">
          {correct} of {verdicts.length} correct{almost > 0 && `, ${almost} almost`}
        </div>
        <div className="text-sm text-muted-foreground">
          {correct === verdicts.length ? 'Bravissimo! On to the next lesson.' : 'Practise the phrases once more, then try again.'}
        </div>
        <Button onClick={onRestart}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Start again
        </Button>
      </CardContent>
    </Card>
  );
}

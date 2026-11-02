import React from 'react';
import { CheckCircle2, MessageCircleQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorAlert } from '@/components/PageHeader';
import { HeardWords } from '@/components/Feedback';
import { MiniRecorder, PlayButton } from '@/components/SpeakControls';
import { useLessonsStore } from '@/stores/lessons';
import { useAskStore } from '@/stores/ask';
import { useNavigationStore } from '@/stores/navigation';
import { itemKey, MASTERY_SCORE } from '@shared/lessons';
import type { Lesson, LessonItem, LessonSection } from '@shared/types/lessons';
import { useAttempt } from './useAttempt';

interface ItemListProps {
  lesson: Lesson;
  section: Extract<LessonSection, 'vocabulary' | 'phrases'>;
  items: LessonItem[];
}

export function ItemList({ lesson, section, items }: ItemListProps) {
  return (
    <Card className="divide-y">
      {items.map((item) => (
        <ItemRow key={item.text} lesson={lesson} section={section} item={item} />
      ))}
    </Card>
  );
}

/** Opens the teacher chat with a question about this word or phrase. */
export function askAbout(text: string, en: string) {
  useNavigationStore.getState().setActiveView('ask');
  void useAskStore.getState().send(`Explain «${text}» (${en}) to a beginner: what each word means and how it is used.`);
}

export function ProgressMark({ progressKey }: { progressKey: string }) {
  const entry = useLessonsStore((s) => s.progress[progressKey]);
  if (!entry) return <span className="w-10" />;
  return entry.best >= MASTERY_SCORE ? (
    <span className="flex w-10 justify-center" title={`Best ${entry.best}% · ${entry.attempts} attempts`}>
      <CheckCircle2 className="h-4 w-4 text-success" />
    </span>
  ) : (
    <span className="w-10 text-center text-xs tabular-nums text-muted-foreground" title={`${entry.attempts} attempts`}>
      {entry.best}%
    </span>
  );
}

function ItemRow({ lesson, section, item }: { lesson: Lesson; section: ItemListProps['section']; item: LessonItem }) {
  const key = itemKey(lesson.id, section, item.text);
  const { busy, result, error, assess } = useAttempt(key, [item.text], { lessonId: lesson.id, history: section === 'phrases' });

  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-base font-medium">{item.text}</div>
          <div className="text-sm text-muted-foreground">
            {item.en}
            {item.note && <span className="ml-2 text-xs italic">· {item.note}</span>}
          </div>
        </div>
        <ProgressMark progressKey={key} />
        <PlayButton text={item.text} />
        <MiniRecorder onRecorded={assess} busy={busy !== null} />
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Ask the teacher about this" onClick={() => askAbout(item.text, item.en)}>
          <MessageCircleQuestion className="h-4 w-4" />
        </Button>
      </div>
      {result && <HeardWords ops={result.diff.ops} score={result.diff.score} />}
      {error && <ErrorAlert>{error}</ErrorAlert>}
    </div>
  );
}

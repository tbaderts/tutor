import React, { useState } from 'react';
import { ArrowLeft, Loader2, RefreshCw, RotateCcw, Save, Sparkles, Target, Trash2 } from 'lucide-react';
import { ErrorAlert } from '@/components/PageHeader';
import { errorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarkdownContent } from '@/components/MarkdownContent';
import { SpeechNotice } from '@/components/SpeechNotice';
import { useLessonsStore } from '@/stores/lessons';
import { lessonProgress } from '@shared/lessons';
import type { Lesson } from '@shared/types/lessons';
import { ProgressBar } from './ProgressBar';
import { ItemList } from './ItemList';
import { DialoguePanel } from './DialoguePanel';
import { ChallengePanel } from './ChallengePanel';

/** `draft`: a generated lesson that is not saved yet — practise it, then save, regenerate or discard. */
export function LessonDetail({ lesson, draft }: { lesson: Lesson; draft?: boolean }) {
  const { progress, open, discardDraft } = useLessonsStore();
  const p = lessonProgress(lesson, progress);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 mb-2 text-muted-foreground"
          onClick={() => (draft ? discardDraft() : open(null))}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {draft ? 'Back to the generator' : 'All lessons'}
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              {lesson.title}
              {lesson.generatedBy && (
                <span
                  className="rounded border border-primary/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary"
                  title={`Written by ${lesson.generatedBy}`}
                >
                  AI
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{lesson.subtitle}</p>
          </div>
          <div className="flex shrink-0 gap-2">{draft ? <DraftActions /> : <LessonActions lesson={lesson} />}</div>
        </div>
      </div>

      {draft && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <span className="font-medium">Draft written by {lesson.generatedBy}.</span> It is not saved yet: try it out, then save it to
            keep it. AI-written lessons can contain mistakes — if a phrase looks odd, ask the teacher with the ? button.
          </div>
        </div>
      )}

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-[1fr_14rem]">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              In this lesson you learn to
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {lesson.goals.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Progress</div>
            <ProgressBar percent={p.percent} />
            <div className="text-sm tabular-nums text-muted-foreground">
              {p.mastered} / {p.total} mastered
            </div>
          </div>
        </CardContent>
      </Card>

      <SpeechNotice />

      <Tabs defaultValue="vocabulary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vocabulary">Vocabulary ({lesson.vocabulary.length})</TabsTrigger>
          <TabsTrigger value="phrases">Phrases ({lesson.phrases.length})</TabsTrigger>
          {lesson.dialogue && <TabsTrigger value="dialogue">Dialogue</TabsTrigger>}
          {lesson.grammar && <TabsTrigger value="grammar">Grammar</TabsTrigger>}
          <TabsTrigger value="challenge">Challenge ({lesson.challenge.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="vocabulary">
          <ItemList lesson={lesson} section="vocabulary" items={lesson.vocabulary} />
        </TabsContent>
        <TabsContent value="phrases">
          <ItemList lesson={lesson} section="phrases" items={lesson.phrases} />
        </TabsContent>
        {lesson.dialogue && (
          <TabsContent value="dialogue">
            <DialoguePanel lesson={lesson} dialogue={lesson.dialogue} />
          </TabsContent>
        )}
        {lesson.grammar && (
          <TabsContent value="grammar">
            <Card>
              <CardContent className="pt-6">
                <MarkdownContent content={lesson.grammar} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
        <TabsContent value="challenge">
          <ChallengePanel lesson={lesson} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** A button that asks for a second click before doing something that can't be undone. */
function ConfirmButton({ icon: Icon, label, confirmLabel, onConfirm }: {
  icon: React.FC<{ className?: string }>;
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <Button
      variant={armed ? 'destructive' : 'outline'}
      size="sm"
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        onConfirm();
      }}
    >
      <Icon className="mr-2 h-4 w-4" />
      {armed ? confirmLabel : label}
    </Button>
  );
}

function LessonActions({ lesson }: { lesson: Lesson }) {
  const { resetLesson, deleteLesson } = useLessonsStore();
  return (
    <>
      {lesson.source === 'user' && (
        <ConfirmButton icon={Trash2} label="Delete" confirmLabel="Click again to delete" onConfirm={() => deleteLesson(lesson.id)} />
      )}
      <ConfirmButton icon={RotateCcw} label="Reset progress" confirmLabel="Click again to reset" onConfirm={() => resetLesson(lesson.id)} />
    </>
  );
}

function DraftActions() {
  const { lastRequest, generation, generate, saveDraft, discardDraft } = useLessonsStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => discardDraft()}>
          <Trash2 className="mr-2 h-4 w-4" />
          Discard
        </Button>
        <Button variant="outline" size="sm" disabled={!lastRequest || !!generation} onClick={() => lastRequest && generate(lastRequest)}>
          {generation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Regenerate
        </Button>
        <Button
          size="sm"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            setError(null);
            try {
              await saveDraft();
            } catch (err) {
              setError(errorMessage(err));
            } finally {
              setSaving(false);
            }
          }}
        >
          <Save className="mr-2 h-4 w-4" />
          Save lesson
        </Button>
      </div>
      {error && <ErrorAlert>{error}</ErrorAlert>}
    </div>
  );
}

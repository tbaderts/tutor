import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Sparkles, TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ErrorAlert } from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import { useConfigStore } from '@/stores/config';
import { useLessonsStore } from '@/stores/lessons';
import { useStatusStore } from '@/stores/status';
import { targetLanguage } from '@shared/languages';
import type { LessonLevel } from '@shared/lessonGen';
import type { LessonCatalog } from '@shared/types/lessons';
import { ProgressBar } from './ProgressBar';

const NEW_TOPIC = '__new__';
/** Rough size of a finished lesson, for the progress bar. */
const TYPICAL_CHARS = 7000;

const IDEAS: { text: string; topic: string }[] = [
  { text: 'At the vet with my dog', topic: 'dog' },
  { text: 'A code review with Italian colleagues', topic: 'work' },
  { text: 'Renting a road bike in Sicily', topic: 'sports' },
  { text: 'Buying fish at the market in Liguria', topic: 'food' },
  { text: 'Asking for a hiking trail in the Cinque Terre', topic: 'travel' },
  { text: 'Booking a trial boxing class', topic: 'sports' },
];

export function GenerateLessonView({ catalog }: { catalog: LessonCatalog }) {
  const { config } = useConfigStore();
  const target = targetLanguage(config.general.targetLanguage);
  const { lastRequest, generation, generateError, generate, cancelGenerate, showGenerator } = useLessonsStore();
  const models = (useStatusStore((s) => s.status?.llm.models) ?? []).filter((m) => !m.toLowerCase().includes('embed'));

  const [description, setDescription] = useState(lastRequest?.description ?? '');
  const [topicId, setTopicId] = useState(lastRequest?.newTopic ? NEW_TOPIC : lastRequest?.topicId ?? catalog.topics[0]?.id ?? NEW_TOPIC);
  const [newTopic, setNewTopic] = useState(lastRequest?.newTopic ?? '');
  const [level, setLevel] = useState<LessonLevel>(lastRequest?.level ?? 'A1');
  const [model, setModel] = useState(lastRequest?.model ?? config.llm.model);
  const modelOptions = models.includes(model) ? models : [model, ...models];

  const canGenerate = description.trim() && (topicId !== NEW_TOPIC || newTopic.trim()) && !generation;
  const submit = () =>
    generate({
      description: description.trim(),
      ...(topicId === NEW_TOPIC ? { newTopic: newTopic.trim() } : { topicId }),
      level,
      model,
    });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-muted-foreground" onClick={() => showGenerator(false)} disabled={!!generation}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          All lessons
        </Button>
        <h1 className="text-2xl font-bold">Generate a lesson</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe a situation and your language model writes a {target.name} lesson for it: vocabulary, phrases, a dialogue, a grammar note
          and a challenge. You can try it out before you save it.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="space-y-2">
            <Label htmlFor="description">What should the lesson be about?</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={!!generation}
              placeholder="e.g. At the vet with my dog: describing symptoms and understanding the advice"
              className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              autoFocus
            />
            <div className="flex flex-wrap gap-2">
              {IDEAS.map((idea) => (
                <button
                  key={idea.text}
                  disabled={!!generation}
                  onClick={() => {
                    setDescription(idea.text);
                    if (catalog.topics.some((t) => t.id === idea.topic)) setTopicId(idea.topic);
                  }}
                  className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {idea.text}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Select value={topicId} onValueChange={setTopicId} disabled={!!generation}>
                <SelectTrigger id="topic"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {catalog.topics.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                  <SelectItem value={NEW_TOPIC}>New topic…</SelectItem>
                </SelectContent>
              </Select>
              {topicId === NEW_TOPIC && (
                <Input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="Name of the new topic, e.g. Family" disabled={!!generation} />
              )}
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <div className="inline-flex rounded-lg bg-muted p-1 text-sm">
                {(['A1', 'A2'] as const).map((l) => (
                  <button
                    key={l}
                    disabled={!!generation}
                    onClick={() => setLevel(l)}
                    className={cn('rounded-md px-4 py-1 font-medium text-muted-foreground', level === l && 'bg-background text-foreground shadow')}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gen-model">Model</Label>
            <Select value={model} onValueChange={setModel} disabled={!!generation}>
              <SelectTrigger id="gen-model"><SelectValue /></SelectTrigger>
              <SelectContent>
                {modelOptions.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Larger models write better {target.name} but take longer, and may not fit next to Whisper on the GPU.
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            <span>
              AI-written lessons can contain mistakes, especially from small models. If something looks odd, use the ? button next to a
              phrase to ask the teacher, or fix the saved YAML file.
            </span>
          </div>

          {generation ? (
            <Progress chars={generation.chars} startedAt={generation.startedAt} onCancel={cancelGenerate} />
          ) : (
            <Button onClick={submit} disabled={!canGenerate} className="w-full">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate lesson
            </Button>
          )}
          {generateError && <ErrorAlert>{generateError}</ErrorAlert>}
        </CardContent>
      </Card>
    </div>
  );
}

function Progress({ chars, startedAt, onCancel }: { chars: number; startedAt: number; onCancel: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.round((now - startedAt) / 1000);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {chars === 0 ? 'Loading the model and reading the example…' : 'Writing the lesson…'}
        </div>
        <div className="flex items-center gap-3">
          <span className="tabular-nums text-muted-foreground">
            {chars.toLocaleString()} characters · {seconds}s
          </span>
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X className="mr-1 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>
      <ProgressBar percent={Math.min(95, (100 * chars) / TYPICAL_CHARS)} />
    </div>
  );
}

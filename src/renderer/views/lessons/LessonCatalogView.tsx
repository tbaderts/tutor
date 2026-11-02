import React from 'react';
import { BookOpen, Bike, Dog, FolderOpen, Landmark, Laptop, MapPin, RefreshCw, Sparkles, Trees, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, ErrorAlert } from '@/components/PageHeader';
import { ProgressBar } from './ProgressBar';
import { useConfigStore } from '@/stores/config';
import { useLessonsStore } from '@/stores/lessons';
import { lessonProgress } from '@shared/lessons';
import { targetLanguage } from '@shared/languages';
import type { LessonCatalog } from '@shared/types/lessons';

const TOPIC_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Laptop, Bike, Dog, MapPin, UtensilsCrossed, Landmark, Trees, BookOpen,
};

export function LessonCatalogView({ catalog }: { catalog: LessonCatalog }) {
  const targetName = targetLanguage(useConfigStore((s) => s.config.general.targetLanguage)).name;
  const { progress, error, load, open, showGenerator } = useLessonsStore();
  const all = catalog.lessons.map((l) => lessonProgress(l, progress));
  const mastered = all.reduce((n, p) => n + p.mastered, 0);
  const total = all.reduce((n, p) => n + p.total, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <PageHeader
        title="Lessons"
        description={`${targetName} lessons around your interests. Listen, then say every word and phrase — 80 % or more counts as mastered.`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => window.tutor.lessons.openFolder()} title={catalog.userDir}>
              <FolderOpen className="mr-2 h-4 w-4" />
              My lessons folder
            </Button>
            <Button variant="outline" size="sm" onClick={() => load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload
            </Button>
            <Button size="sm" onClick={() => showGenerator(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate a lesson
            </Button>
          </>
        }
      />

      {error && <ErrorAlert>{error}</ErrorAlert>}
      {catalog.errors.length > 0 && <ErrorAlert>{`Some lesson files could not be read:\n${catalog.errors.join('\n')}`}</ErrorAlert>}

      {catalog.lessons.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No {targetName} lessons yet. Generate one, or use “My lessons folder” to add your own (copy an Italian lesson as a template).
        </p>
      ) : (
        <div className="flex items-center gap-4 rounded-xl border bg-card px-5 py-4">
          <div className="text-sm font-medium">Overall</div>
          <ProgressBar percent={total ? (100 * mastered) / total : 0} className="flex-1" />
          <div className="text-sm tabular-nums text-muted-foreground">
            {mastered} / {total} items mastered
          </div>
        </div>
      )}

      {catalog.topics.map((topic) => {
        const lessons = catalog.lessons.filter((l) => l.topic === topic.id);
        if (!lessons.length) return null;
        const Icon = TOPIC_ICONS[topic.icon ?? ''] ?? BookOpen;
        return (
          <section key={topic.id}>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-tight">
                  {topic.title}
                  {topic.titleTarget && <span className="ml-2 font-normal text-muted-foreground">· {topic.titleTarget}</span>}
                </h2>
                {topic.description && <p className="text-sm text-muted-foreground">{topic.description}</p>}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lessons.map((lesson) => {
                const p = lessonProgress(lesson, progress);
                return (
                  <button
                    key={lesson.id}
                    onClick={() => open(lesson.id)}
                    className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-accent"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold">{lesson.title}</div>
                      <div className="flex shrink-0 gap-1">
                        {lesson.generatedBy ? (
                          <span
                            className="rounded border border-primary/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary"
                            title={`Written by ${lesson.generatedBy}`}
                          >
                            AI
                          </span>
                        ) : (
                          lesson.source === 'user' && (
                            <span className="rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">mine</span>
                          )
                        )}
                        <span className="rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-semibold text-sidebar-accent-foreground">
                          {lesson.level}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 text-sm text-muted-foreground">{lesson.subtitle}</div>
                    <div className="flex items-center gap-2">
                      <ProgressBar percent={p.percent} className="flex-1" />
                      <span className="text-xs tabular-nums text-muted-foreground">{p.percent}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

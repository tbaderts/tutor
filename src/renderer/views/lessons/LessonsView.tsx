import React, { useEffect } from 'react';
import { useConfigStore } from '@/stores/config';
import { useLessonsStore } from '@/stores/lessons';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { LessonCatalogView } from './LessonCatalogView';
import { LessonDetail } from './LessonDetail';
import { GenerateLessonView } from './GenerateLessonView';

export function LessonsView() {
  const targetLanguage = useConfigStore((s) => s.config.general.targetLanguage);
  const { catalog, openLessonId, generatorOpen, draft, load } = useLessonsStore();

  // Lessons belong to the language being practised.
  useEffect(() => {
    void load();
  }, [load, targetLanguage]);

  if (!catalog) return <LoadingSpinner />;
  if (draft) return <LessonDetail lesson={draft.lesson} key={draft.lesson.id} draft />;
  if (generatorOpen) return <GenerateLessonView catalog={catalog} />;
  const lesson = catalog.lessons.find((l) => l.id === openLessonId);
  return lesson ? <LessonDetail lesson={lesson} key={lesson.id} /> : <LessonCatalogView catalog={catalog} />;
}

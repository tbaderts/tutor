import React, { Suspense, lazy } from 'react';
import { useNavigationStore, type ViewId } from '@/stores/navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const LessonsView = lazy(() => import('@/views/lessons/LessonsView').then((m) => ({ default: m.LessonsView })));
const PracticeView = lazy(() => import('@/views/practice/PracticeView').then((m) => ({ default: m.PracticeView })));
const FreeSpeakingView = lazy(() => import('@/views/free/FreeSpeakingView').then((m) => ({ default: m.FreeSpeakingView })));
const AskView = lazy(() => import('@/views/ask/AskView').then((m) => ({ default: m.AskView })));
const HistoryView = lazy(() => import('@/views/history/HistoryView').then((m) => ({ default: m.HistoryView })));
const SettingsView = lazy(() => import('@/views/settings/SettingsView').then((m) => ({ default: m.SettingsView })));
const AboutView = lazy(() => import('@/views/about/AboutView').then((m) => ({ default: m.AboutView })));

const VIEW_MAP: Record<ViewId, React.LazyExoticComponent<React.FC>> = {
  lessons: LessonsView,
  practice: PracticeView,
  free: FreeSpeakingView,
  ask: AskView,
  history: HistoryView,
  settings: SettingsView,
  about: AboutView,
};

export function ContentArea() {
  const activeView = useNavigationStore((s) => s.activeView);
  const ViewComponent = VIEW_MAP[activeView];

  return (
    <main className="flex-1 overflow-auto bg-background">
      <Suspense fallback={<LoadingSpinner />}>
        <ViewComponent />
      </Suspense>
    </main>
  );
}

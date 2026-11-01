import React, { useEffect } from 'react';
import '@/api/tutor-api';
import { Sidebar } from '@/components/layout/Sidebar';
import { ContentArea } from '@/components/layout/ContentArea';
import { StatusBar } from '@/components/layout/StatusBar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useConfigStore } from '@/stores/config';
import { useStatusStore } from '@/stores/status';
import { useHistoryStore } from '@/stores/history';
import { useNavigationStore } from '@/stores/navigation';

export function App() {
  const loadConfig = useConfigStore((s) => s.loadConfig);
  const loaded = useConfigStore((s) => s.loaded);

  useEffect(() => {
    loadConfig();
    useHistoryStore.getState().load();
    const stopPolling = useStatusStore.getState().startPolling();
    const stopNavigate = window.tutor.onNavigate((view) => useNavigationStore.getState().setActiveView(view));
    return () => {
      stopPolling();
      stopNavigate();
    };
  }, [loadConfig]);

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="mb-2 text-lg font-medium">Tutor</div>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen flex-col bg-background text-foreground">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <ContentArea />
        </div>
        <StatusBar />
      </div>
    </ErrorBoundary>
  );
}

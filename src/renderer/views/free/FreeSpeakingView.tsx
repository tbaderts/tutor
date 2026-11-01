import React from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader, ErrorAlert } from '@/components/PageHeader';
import { RecordButton } from '@/components/RecordButton';
import { VerdictBanner } from '@/components/Feedback';
import { SpeechNotice } from '@/components/SpeechNotice';
import { useConfigStore } from '@/stores/config';
import { useFreeStore } from '@/stores/free';
import { usePracticeStore } from '@/stores/practice';
import { useNavigationStore } from '@/stores/navigation';
import { useSpeechReady } from '@/stores/status';
import { targetLanguage } from '@shared/languages';
import { normWords } from '@shared/wordDiff';

export function FreeSpeakingView() {
  const targetName = targetLanguage(useConfigStore((s) => s.config.general.targetLanguage)).name;
  const { busy, heard, check, error, assess } = useFreeStore();
  const speechReady = useSpeechReady();
  const corrected = check?.corrected ?? '';
  const needsCorrection = !!heard && !!corrected && normWords(corrected).join(' ') !== normWords(heard).join(' ');

  const practiseCorrected = () => {
    usePracticeStore.getState().setTarget(corrected, check?.meaning || null);
    useNavigationStore.getState().setActiveView('practice');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <PageHeader title="Free Speaking" description={`Say anything in ${targetName} and get a grammar check.`} />
      <SpeechNotice />

      <Card>
        <CardContent className="space-y-6 pt-6">
          <RecordButton onRecorded={assess} disabled={!speechReady || busy !== null} spaceHotkey />
          {busy && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {busy === 'listening' ? 'Listening…' : 'Checking…'}
            </div>
          )}
          {error && <ErrorAlert>{error}</ErrorAlert>}

          {heard && (
            <div className="space-y-4 border-t pt-6">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Heard</div>
                <div className="text-xl">{heard}</div>
              </div>
              {check && (
                <>
                  <VerdictBanner verdict={check.verdict}>{check.feedback}</VerdictBanner>
                  {check.meaning && <div className="text-sm text-muted-foreground">Means: {check.meaning}</div>}
                  {needsCorrection && (
                    <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/50 px-4 py-3">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Correct version</div>
                        <div className="text-lg font-medium">{corrected}</div>
                      </div>
                      <Button size="sm" onClick={practiseCorrected}>
                        Practise it
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

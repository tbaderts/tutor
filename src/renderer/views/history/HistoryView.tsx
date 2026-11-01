import React, { useMemo, useState } from 'react';
import { Play, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/PageHeader';
import { VerdictBadge } from '@/components/Feedback';
import { cn } from '@/lib/utils';
import { useConfigStore } from '@/stores/config';
import { useHistoryStore } from '@/stores/history';
import { usePracticeStore } from '@/stores/practice';
import { useNavigationStore } from '@/stores/navigation';
import { targetLanguage } from '@shared/languages';
import type { HistoryEntry } from '@shared/types/tutor';

const timeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' });

export function HistoryView() {
  const { entries, clear } = useHistoryStore();
  const targetId = useConfigStore((s) => s.config.general.targetLanguage);
  const [onlyCurrent, setOnlyCurrent] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const shown = useMemo(
    () => (onlyCurrent ? entries.filter((e) => e.targetLanguage === targetId) : entries),
    [entries, onlyCurrent, targetId],
  );

  const practise = (e: HistoryEntry) => {
    usePracticeStore.getState().setTarget(e.target, e.source ?? null);
    useNavigationStore.getState().setActiveView('practice');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <PageHeader
        title="History"
        description="Every practice attempt, saved on this computer."
        actions={
          entries.length > 0 && (
            <Button
              variant={confirmClear ? 'destructive' : 'outline'}
              size="sm"
              onBlur={() => setConfirmClear(false)}
              onClick={() => {
                if (!confirmClear) return setConfirmClear(true);
                void clear();
                setConfirmClear(false);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {confirmClear ? 'Click again to clear all' : 'Clear history'}
            </Button>
          )
        }
      />

      <Stats entries={shown} />

      <div className="flex items-center gap-2">
        <Switch id="only-current" checked={onlyCurrent} onCheckedChange={setOnlyCurrent} />
        <Label htmlFor="only-current">Only {targetLanguage(targetId).name}</Label>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">Your attempts will appear here.</p>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Sentence</th>
                <th className="px-4 py-2 font-medium">Heard</th>
                <th className="px-4 py-2 font-medium">Match</th>
                <th className="px-4 py-2 font-medium">Verdict</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">
                    {timeFormat.format(new Date(e.at))}
                    {!onlyCurrent && <span className="ml-2 font-mono uppercase">{e.targetLanguage}</span>}
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{e.target}</div>
                    {e.source && <div className="text-xs text-muted-foreground">{e.source}</div>}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{e.heard}</td>
                  <td className="px-4 py-2">
                    <ScoreBar score={e.score} />
                  </td>
                  <td className="px-4 py-2">
                    <VerdictBadge verdict={e.verdict} />
                  </td>
                  <td className="px-2 py-2">
                    <Button variant="ghost" size="icon" title="Practise again" onClick={() => practise(e)}>
                      <Play className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 90 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-destructive';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${score}%` }} />
      </div>
      <span className="tabular-nums text-xs">{score}%</span>
    </div>
  );
}

function Stats({ entries }: { entries: HistoryEntry[] }) {
  const today = new Date().toDateString();
  const attempts = entries.length;
  const avg = attempts ? Math.round(entries.reduce((sum, e) => sum + e.score, 0) / attempts) : 0;
  const correct = attempts ? Math.round((100 * entries.filter((e) => e.verdict === 'correct').length) / attempts) : 0;
  const todayCount = entries.filter((e) => new Date(e.at).toDateString() === today).length;
  const sentences = new Set(entries.map((e) => e.target)).size;
  const tiles = [
    { label: 'Attempts', value: attempts },
    { label: 'Today', value: todayCount },
    { label: 'Sentences', value: sentences },
    { label: 'Avg. match', value: `${avg}%` },
    { label: 'Correct', value: `${correct}%` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {tiles.map((t) => (
        <Card key={t.label}>
          <CardContent className="p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.label}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{t.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

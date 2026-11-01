import React from 'react';
import { CheckCircle2, CircleHelp, CircleAlert, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DiffOp } from '@shared/wordDiff';
import type { Verdict } from '@shared/types/tutor';

const VERDICT_STYLE: Record<Verdict, { icon: React.FC<{ className?: string }>; label: string; className: string }> = {
  correct: { icon: CheckCircle2, label: 'Correct', className: 'border-success/50 bg-success/10 text-success' },
  almost: { icon: CircleAlert, label: 'Almost', className: 'border-warning/50 bg-warning/10 text-warning' },
  incorrect: { icon: XCircle, label: 'Incorrect', className: 'border-destructive/50 bg-destructive/10 text-destructive' },
  '?': { icon: CircleHelp, label: 'Unclear', className: 'border-border bg-muted text-muted-foreground' },
};

export function VerdictBanner({ verdict, children }: { verdict: Verdict; children?: React.ReactNode }) {
  const style = VERDICT_STYLE[verdict] ?? VERDICT_STYLE['?'];
  const Icon = style.icon;
  return (
    <div className={cn('flex items-start gap-3 rounded-lg border px-4 py-3', style.className)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="text-sm">
        <span className="font-semibold uppercase tracking-wide">{style.label}</span>
        {children && <span className="text-foreground"> — {children}</span>}
      </div>
    </div>
  );
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const style = VERDICT_STYLE[verdict] ?? VERDICT_STYLE['?'];
  return <span className={cn('inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold', style.className)}>{style.label}</span>;
}

/** Target and heard words side by side: matches green, missed target words red, wrong heard words amber. */
export function SentenceDiff({ ops }: { ops: DiffOp[] }) {
  const row = (side: 'target' | 'heard') =>
    ops.flatMap((op, i) => {
      const words = op[side];
      if (!words.length) return [];
      const cls =
        op.op === 'equal'
          ? 'text-success'
          : side === 'target'
            ? 'font-semibold text-destructive underline decoration-wavy decoration-destructive/50 underline-offset-4'
            : 'font-semibold text-warning';
      return [<span key={i} className={cls}>{words.join(' ')}</span>];
    });

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-lg">
      <dt className="pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Target</dt>
      <dd className="flex flex-wrap gap-x-1.5">{row('target')}</dd>
      <dt className="pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Heard</dt>
      <dd className="flex flex-wrap gap-x-1.5">{row('heard')}</dd>
    </dl>
  );
}

export function ScoreMeter({ score }: { score: number }) {
  const color = score >= 90 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-destructive';
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="text-3xl font-bold tabular-nums">{score}%</div>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${score}%` }} />
      </div>
      <div className="text-xs text-muted-foreground">word match</div>
    </div>
  );
}

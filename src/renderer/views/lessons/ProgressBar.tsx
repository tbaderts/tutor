import React from 'react';
import { cn } from '@/lib/utils';

export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-muted', className)}>
      <div
        className={cn('h-full rounded-full transition-all', percent >= 100 ? 'bg-success' : 'bg-primary')}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

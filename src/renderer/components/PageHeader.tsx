import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorAlert({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="whitespace-pre-line rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
      {children}
    </div>
  );
}

import React from 'react';
import { clsx } from 'clsx';

export interface PageContainerProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({
  title,
  subtitle,
  action,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={clsx('p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full', className)}>
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
      </div>

      {/* Main Content Body */}
      <div>{children}</div>
    </div>
  );
}

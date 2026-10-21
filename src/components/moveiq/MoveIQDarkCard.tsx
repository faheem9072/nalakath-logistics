'use client';

import React from 'react';

interface MoveIQDarkCardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function MoveIQDarkCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}: MoveIQDarkCardProps) {
  return (
    <div
      className={`bg-[#121316] text-white rounded-[28px] p-5 shadow-md border border-stone-800/80 transition-all ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            {title && (
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-gray-400 font-normal mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

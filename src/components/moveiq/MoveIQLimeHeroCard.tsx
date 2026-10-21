'use client';

import React from 'react';
import { Truck, ArrowUpRight, Radio } from 'lucide-react';

interface MoveIQLimeHeroCardProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  actionText?: string;
  onAction?: () => void;
  activeCount?: number;
  totalCount?: number;
  className?: string;
}

export function MoveIQLimeHeroCard({
  title = 'Vehicle on the road',
  subtitle = 'Expedite cargo fleet with real-time tracking',
  badge = 'Live Operations',
  actionText = 'Track vehicles',
  onAction,
  activeCount,
  totalCount,
  className = '',
}: MoveIQLimeHeroCardProps) {
  return (
    <div
      className={`relative overflow-hidden bg-[#D4F65B] text-[#121316] rounded-[28px] p-5 shadow-xs transition-all ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="inline-flex items-center gap-1.5 bg-[#121316]/10 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-[#121316]">
          <span className="w-2 h-2 rounded-full bg-[#121316] animate-pulse" />
          <span>{badge}</span>
        </div>

        {activeCount !== undefined && (
          <span className="text-xs font-extrabold bg-[#121316] text-white px-2.5 py-1 rounded-full">
            {activeCount}{totalCount !== undefined ? ` / ${totalCount}` : ''} Active
          </span>
        )}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 max-w-[65%]">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight text-[#121316]">
            {title}
          </h2>
          <p className="text-xs font-medium text-[#121316]/80 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Truck Graphic Representation */}
        <div className="shrink-0 w-24 h-20 bg-white/40 rounded-2xl p-2 flex items-center justify-center backdrop-blur-2xs border border-white/50 shadow-2xs">
          <Truck className="w-12 h-12 text-[#121316] opacity-90" strokeWidth={1.7} />
        </div>
      </div>

      {/* Action Button: Dark Pill like MoveIQ */}
      {actionText && (
        <div className="mt-4 pt-1">
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-2 bg-[#121316] text-white hover:bg-black text-xs font-bold px-4 py-2.5 rounded-full shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-[#D4F65B] animate-pulse" />
            <span>{actionText}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-gray-300" />
          </button>
        </div>
      )}
    </div>
  );
}

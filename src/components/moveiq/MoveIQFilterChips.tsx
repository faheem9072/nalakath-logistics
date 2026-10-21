'use client';

import React from 'react';
import { ArrowUpDown } from 'lucide-react';

export interface FilterChipOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

interface MoveIQFilterChipsProps<T extends string = string> {
  options: FilterChipOption<T>[];
  activeId: T;
  onSelect: (id: T) => void;
  showSortButton?: boolean;
  onSortClick?: () => void;
  className?: string;
}

export function MoveIQFilterChips<T extends string = string>({
  options,
  activeId,
  onSelect,
  showSortButton = false,
  onSortClick,
  className = '',
}: MoveIQFilterChipsProps<T>) {
  return (
    <div className={`flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5 ${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        {options.map((opt) => {
          const isActive = activeId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#121316] text-white shadow-xs'
                  : 'bg-white text-gray-700 border border-gray-200/80 hover:bg-gray-50 shadow-2xs'
              }`}
            >
              <span>{opt.label}</span>
              {opt.count !== undefined && (
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showSortButton && (
        <button
          type="button"
          onClick={onSortClick}
          className="w-10 h-10 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center text-gray-600 hover:text-black shrink-0 cursor-pointer"
          aria-label="Sort options"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

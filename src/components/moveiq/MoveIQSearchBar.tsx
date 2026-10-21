'use client';

import React from 'react';
import { Search, Plus, X } from 'lucide-react';

interface MoveIQSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onPlusClick?: () => void;
  showPlusButton?: boolean;
  className?: string;
}

export function MoveIQSearchBar({
  value,
  onChange,
  placeholder = 'Search order...',
  onPlusClick,
  showPlusButton = true,
  className = '',
}: MoveIQSearchBarProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Pill Search Input */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-12 pl-10 pr-9 bg-white border border-gray-200/80 rounded-full text-sm text-[#121316] placeholder:text-gray-400 shadow-2xs focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200/60 transition-all font-medium"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Rounded '+' Action Button */}
      {showPlusButton && onPlusClick && (
        <button
          type="button"
          onClick={onPlusClick}
          className="w-12 h-12 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center text-gray-900 hover:bg-gray-50 active:scale-95 transition-all shrink-0 cursor-pointer"
          aria-label="Add item"
        >
          <Plus className="w-5 h-5 text-[#121316]" strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}

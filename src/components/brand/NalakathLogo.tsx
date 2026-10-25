'use client';

import React from 'react';

export interface NalakathLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'mark' | 'horizontal' | 'badge' | 'circle';
  theme?: 'dark' | 'light' | 'auto';
  showSubtitle?: boolean;
}

export function NalakathLogo({
  className = '',
  size = 'md',
  variant = 'horizontal',
  theme = 'auto',
  showSubtitle = true,
}: NalakathLogoProps) {
  const iconSizes = {
    xs: 'h-6 w-6',
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  if (variant === 'mark' || variant === 'circle') {
    return (
      <div className={`inline-flex items-center shrink-0 ${className}`}>
        <img
          src="/nalakath-logo.png"
          alt="Nalakath Logistics"
          className={`${iconSizes[size]} rounded-full object-contain select-none shadow-2xs border border-white/20`}
        />
      </div>
    );
  }

  const isDarkBg = theme === 'dark';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <img
        src="/nalakath-logo.png"
        alt="Nalakath Logistics"
        className={`${iconSizes[size]} rounded-full object-contain shrink-0 shadow-2xs border border-gray-200/80`}
      />
      <div className="flex flex-col text-left leading-none">
        <span
          className={`font-black tracking-tight ${textSizes[size]} ${
            isDarkBg ? 'text-white' : 'text-[#121316]'
          }`}
        >
          NALAKATH
        </span>
        {showSubtitle && (
          <span
            className={`text-[9px] font-extrabold uppercase tracking-widest mt-0.5 ${
              isDarkBg ? 'text-[#D4F65B]' : 'text-gray-500'
            }`}
          >
            LOGISTICS
          </span>
        )}
      </div>
    </div>
  );
}

// Backward-compatibility export
export const KoreLogo = NalakathLogo;

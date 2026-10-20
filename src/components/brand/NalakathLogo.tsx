import React, { useState } from 'react';

export interface NalakathLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'circle' | 'horizontal' | 'badge';
  showSubtitle?: boolean;
}

export function NalakathLogo({
  className = '',
  size = 'md',
  variant = 'circle',
  showSubtitle = true,
}: NalakathLogoProps) {
  const [imageError, setImageError] = useState(false);

  const dimensions = {
    xs: { width: 28, height: 28, sizeClass: 'w-7 h-7' },
    sm: { width: 38, height: 38, sizeClass: 'w-9.5 h-9.5' },
    md: { width: 48, height: 48, sizeClass: 'w-12 h-12' },
    lg: { width: 76, height: 76, sizeClass: 'w-[76px] h-[76px]' },
    xl: { width: 120, height: 120, sizeClass: 'w-28 h-28 sm:w-32 sm:h-32' },
  };

  const { width, height, sizeClass } = dimensions[size];

  const logoImg = (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden bg-black flex items-center justify-center border-2 border-white/20 shadow-md ${sizeClass}`}
      style={{ width, height }}
    >
      {!imageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/nalakath-logo.png"
          alt="Nalakath Logistics Since 1998"
          className="w-full h-full object-cover object-center select-none"
          onError={() => setImageError(true)}
        />
      ) : (
        /* Fallback SVG representation */
        <svg viewBox="0 0 300 300" className="w-full h-full" fill="none">
          <circle cx="150" cy="150" r="145" fill="#0A0A0A" />
          <circle cx="150" cy="150" r="140" stroke="#FFFFFF" strokeWidth="4" />
          <text
            x="150"
            y="155"
            textAnchor="middle"
            fill="#FFFFFF"
            fontFamily="'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="32"
            letterSpacing="2"
          >
            NALAKATH
          </text>
          <text
            x="150"
            y="180"
            textAnchor="middle"
            fill="#FFFFFF"
            fontFamily="sans-serif"
            fontWeight="700"
            fontSize="12"
            letterSpacing="4"
          >
            LOGISTICS 1998
          </text>
        </svg>
      )}
    </div>
  );

  if (variant === 'horizontal') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {logoImg}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-base sm:text-lg tracking-tight text-white uppercase font-sans leading-none">
              NALAKATH
            </span>
            <span className="text-[10px] font-bold text-white/90 bg-white/10 px-1.5 py-0.5 rounded border border-white/20 leading-none">
              1998
            </span>
          </div>
          {showSubtitle && (
            <span className="text-[11px] text-slate-300 font-bold uppercase tracking-[0.2em] mt-0.5 leading-none">
              LOGISTICS
            </span>
          )}
        </div>
      </div>
    );
  }

  return <div className={`inline-flex shrink-0 ${className}`}>{logoImg}</div>;
}


import React from 'react';

export interface NalakathLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'circle' | 'horizontal' | 'badge';
}

export function NalakathLogo({
  className = '',
  size = 'md',
  variant = 'circle',
}: NalakathLogoProps) {
  const dimensions = {
    sm: { width: 36, height: 36 },
    md: { width: 48, height: 48 },
    lg: { width: 72, height: 72 },
    xl: { width: 120, height: 120 },
  };

  const { width, height } = dimensions[size];

  if (variant === 'horizontal') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* Emblem */}
        <div className="relative shrink-0 w-10 h-10 rounded-full bg-black flex items-center justify-center p-1.5 shadow-md border border-slate-800">
          <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
            {/* Truck Cab in Red */}
            <path
              d="M35 115 L35 95 Q35 88 42 85 L65 85 L85 100 L115 100 L115 125 L35 125 Z"
              fill="#E11D48"
            />
            {/* Truck Windshield */}
            <path d="M68 89 L82 100 L68 100 Z" fill="#1E293B" />
            {/* Wheels & Grill Accents */}
            <circle cx="50" cy="125" r="9" fill="#111827" stroke="#E11D48" strokeWidth="3" />
            <line x1="68" y1="112" x2="68" y2="124" stroke="#FFFFFF" strokeWidth="2.5" />
            <line x1="75" y1="112" x2="75" y2="124" stroke="#FFFFFF" strokeWidth="2.5" />
            <line x1="82" y1="112" x2="82" y2="124" stroke="#FFFFFF" strokeWidth="2.5" />
            {/* Text NALAKATH */}
            <text
              x="92"
              y="118"
              fill="#FFFFFF"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="900"
              fontSize="20"
              letterSpacing="0.5"
            >
              NALAKATH
            </text>
          </svg>
        </div>
        {/* Brand Text */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm tracking-tight text-white uppercase font-sans">
              Nalakath
            </span>
            <span className="text-[10px] font-bold text-rose-500 bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-800/60">
              1998
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest -mt-0.5">
            Logistics Corp
          </span>
        </div>
      </div>
    );
  }

  // Exact reproduction of the Nalakath Logistics circular badge from the photo
  return (
    <svg
      viewBox="0 0 300 300"
      width={width}
      height={height}
      className={`shrink-0 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer circular black background */}
      <circle cx="150" cy="150" r="145" fill="#0A0A0A" />

      {/* Red Truck Cab */}
      <g>
        {/* Truck Roof fairing & body */}
        <path
          d="M75 148 L75 125 Q75 118 84 116 L108 116 Q112 116 116 120 L132 136 L165 118 L165 148 Z"
          fill="#D92228"
        />
        {/* Cabin main block */}
        <rect x="75" y="132" width="55" height="28" rx="2" fill="#D92228" />

        {/* Truck Windshield glass */}
        <path d="M112 121 L128 135 L108 135 L108 121 Z" fill="#0A0A0A" />
        <rect x="92" y="121" width="12" height="14" rx="1" fill="#0A0A0A" />

        {/* Wheels */}
        <circle cx="92" cy="160" r="14" fill="#0A0A0A" stroke="#D92228" strokeWidth="4" />
        <circle cx="92" cy="160" r="6" fill="#D92228" />

        {/* Red & White grill lines below cabin */}
        <rect x="110" y="148" width="6" height="15" fill="#FFFFFF" />
        <rect x="119" y="148" width="6" height="15" fill="#FFFFFF" />
        <rect x="128" y="148" width="6" height="15" fill="#FFFFFF" />
        <line x1="75" y1="162" x2="135" y2="162" stroke="#D92228" strokeWidth="3" />
      </g>

      {/* Red accent line over NALAKATH */}
      <path d="M132 122 L260 134" stroke="#D92228" strokeWidth="4.5" strokeLinecap="round" />

      {/* NALAKATH text */}
      <text
        x="136"
        y="160"
        fill="#FFFFFF"
        fontFamily="'Impact', 'Arial Black', sans-serif"
        fontWeight="900"
        fontSize="34"
        letterSpacing="0.5"
      >
        NALAKATH
      </text>

      {/* Horizontal Divider Line Bar */}
      <line x1="75" y1="168" x2="262" y2="168" stroke="#FFFFFF" strokeWidth="3.5" />

      {/* Bottom Sub-bar */}
      {/* "SINCE 1998" */}
      <text
        x="82"
        y="180"
        fill="#FFFFFF"
        fontFamily="'Arial', sans-serif"
        fontWeight="800"
        fontSize="10"
        letterSpacing="0.8"
      >
        SINCE 1998
      </text>

      {/* Vertical hatched bar divider */}
      <line x1="138" y1="171" x2="138" y2="183" stroke="#FFFFFF" strokeWidth="2.5" />
      <line x1="142" y1="171" x2="142" y2="183" stroke="#FFFFFF" strokeWidth="2.5" />
      <line x1="146" y1="171" x2="146" y2="183" stroke="#FFFFFF" strokeWidth="2.5" />

      {/* "L O G I S T I C S" */}
      <text
        x="154"
        y="180"
        fill="#FFFFFF"
        fontFamily="'Arial Black', sans-serif"
        fontWeight="900"
        fontSize="10.5"
        letterSpacing="3"
      >
        LOGISTICS
      </text>

      {/* Lower bounding line */}
      <line x1="75" y1="185" x2="262" y2="185" stroke="#FFFFFF" strokeWidth="3.5" />
    </svg>
  );
}

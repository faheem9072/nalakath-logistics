'use client';

import React, { useEffect, useState } from 'react';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Check if splash has already been shown in this browser session
    try {
      const alreadyShown = sessionStorage.getItem('kore_splash_shown');
      if (alreadyShown) {
        setIsVisible(false);
        return;
      }
    } catch {
      // ignore storage errors
    }

    // Show for 1.3s, fade out over 250ms (~1.5s total)
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 1300);

    const removeTimer = setTimeout(() => {
      setIsVisible(false);
      try {
        sessionStorage.setItem('kore_splash_shown', 'true');
      } catch {
        // ignore
      }
    }, 1550);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#121316] text-white flex flex-col items-center justify-between py-12 px-6 transition-opacity duration-300 select-none ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      <div />

      {/* Center Nalakath Logistics Logo & Brand Identity */}
      <div className="flex flex-col items-center text-center space-y-5 animate-in zoom-in-95 duration-400">
        <div className="relative flex items-center justify-center">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden p-1 shadow-2xl border-2 border-stone-700 flex items-center justify-center bg-black">
            <img
              src="/nalakath-logo.png"
              alt="Nalakath Logistics"
              className="w-full h-full object-contain"
            />
          </div>
          {/* Subtle lime glow ring */}
          <div className="absolute inset-0 rounded-full border border-[#D4F65B]/30 animate-ping opacity-25 pointer-events-none" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wider">
            NALAKATH
          </h1>
          <p className="text-xs font-bold text-[#D4F65B] tracking-widest uppercase">
            LOGISTICS • SINCE 1998
          </p>
        </div>

        {/* Smooth loading bar indicator in MoveIQ Lime accent */}
        <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden mt-3">
          <div className="h-full bg-[#D4F65B] rounded-full animate-pulse w-3/4" />
        </div>
      </div>

      {/* Subtle Kore Footer */}
      <div className="text-center">
        <p className="text-[11px] font-medium text-gray-400 tracking-wide">
          Designed and developed by Kore
        </p>
      </div>
    </div>
  );
}

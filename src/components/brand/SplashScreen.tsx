'use client';

import React, { useEffect, useState } from 'react';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Check if splash has already been shown in this browser session
    try {
      const alreadyShown = sessionStorage.getItem('nalakath_splash_shown');
      if (alreadyShown) {
        setIsVisible(false);
        return;
      }
    } catch {
      // ignore storage errors
    }

    // Show for 1.4s, then fade out over 300ms
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 1400);

    const removeTimer = setTimeout(() => {
      setIsVisible(false);
      try {
        sessionStorage.setItem('nalakath_splash_shown', 'true');
      } catch {
        // ignore
      }
    }, 1750);

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

      {/* Center Logo & Brand Identity */}
      <div className="flex flex-col items-center text-center space-y-5 animate-in zoom-in-95 duration-500">
        <div className="relative">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-white/10 shadow-2xl border border-white/20 flex items-center justify-center">
            <img
              src="/nalakath-logo.png"
              alt="Nalakath Logistics"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          {/* Subtle lime glow ring */}
          <div className="absolute inset-0 rounded-full border border-[#D4F65B]/40 animate-ping opacity-30" />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
            Nalakath Logistics
          </h1>
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">
            Fleet Trip-Tracker • Since 1998
          </p>
        </div>

        {/* Smooth loading bar indicator in MoveIQ Lime accent */}
        <div className="w-36 h-1 bg-white/10 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-[#D4F65B] rounded-full animate-pulse w-3/4" />
        </div>
      </div>

      {/* Kore Footer on Splash */}
      <div className="text-center">
        <p className="text-[11px] font-medium text-gray-500 tracking-wide">
          Designed and developed by Kore
        </p>
      </div>
    </div>
  );
}

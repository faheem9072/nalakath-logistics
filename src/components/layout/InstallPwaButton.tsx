'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPwaButton({ className = '' }: { className?: string }) {
  const { lang, t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Check if already in standalone (PWA) mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstructions(true);
    }
  };

  if (isInstalled) {
    return null; // Already running as installed app
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        type="button"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121316] hover:bg-black text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer ${className}`}
        title="Install app to home screen"
      >
        <Smartphone className="w-3.5 h-3.5 text-[#D4F65B]" />
        <span>Install App</span>
      </button>

      {/* Mobile Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white text-[#121316] rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[#121316] flex items-center justify-center text-[#D4F65B]">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">
                    Nalakath Logistics App
                  </h3>
                  <p className="text-[10px] text-gray-500 font-medium">
                    Install as high-speed mobile app
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="p-1 text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
              <div className="bg-[#F8F9FA] p-3.5 rounded-2xl border border-gray-200/80 space-y-1.5">
                <p className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Android Phone (Chrome):
                </p>
                <p className="text-[11px] text-gray-600 leading-normal">
                  Tap the 3 dots menu (⋮) at top right and choose <b>&quot;Add to Home screen&quot;</b> or <b>&quot;Install App&quot;</b>.
                </p>
              </div>

              <div className="bg-[#F8F9FA] p-3.5 rounded-2xl border border-gray-200/80 space-y-1.5">
                <p className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  iPhone (Safari):
                </p>
                <p className="text-[11px] text-gray-600 leading-normal">
                  Tap the Share icon at bottom and select <b>&quot;Add to Home Screen&quot;</b>.
                </p>
              </div>

              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl text-[11px] font-semibold text-center">
                Instant launch with zero lag, full-screen view &amp; offline capability!
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="w-full h-11 rounded-2xl bg-[#121316] hover:bg-black text-white text-xs font-bold cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

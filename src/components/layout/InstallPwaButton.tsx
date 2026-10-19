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
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer ${className}`}
        title={lang === 'ml' ? 'ഫോണിൽ ആപ്പായി ഇൻസ്റ്റാൾ ചെയ്യുക' : 'Install app to home screen'}
      >
        <Download className="w-3.5 h-3.5 animate-bounce" />
        <span>{lang === 'ml' ? 'ആപ്പ് ഇൻസ്റ്റാൾ' : 'Install App'}</span>
      </button>

      {/* Mobile Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold">
                  {lang === 'ml' ? 'ഫോണിൽ ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യാൻ' : 'Install Nalakath App'}
                </h3>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-2">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  {lang === 'ml' ? 'ആൻഡ്രോയിഡ് ക്രോമിൽ (Chrome):' : 'Android Chrome:'}
                </p>
                <p className="text-slate-300 text-[11px]">
                  {lang === 'ml'
                    ? 'മുകളിൽ വലതുവശത്തുള്ള 3 ഡോട്ടുകൾ (⋮) ക്ലിക്ക് ചെയ്ത് "Add to Home screen" അല്ലെങ്കിൽ "Install app" തിരഞ്ഞെടുക്കുക.'
                    : 'Tap the 3 dots menu (⋮) at top right and choose "Add to Home screen" or "Install App".'}
                </p>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-2">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  {lang === 'ml' ? 'ഐഫോൺ സഫാരിയിൽ (iPhone Safari):' : 'iPhone Safari:'}
                </p>
                <p className="text-slate-300 text-[11px]">
                  {lang === 'ml'
                    ? 'താഴെയുള്ള "Share" ബട്ടണിൽ ക്ലിക്ക് ചെയ്ത് താഴേക്ക് സ്ക്രോൾ ചെയ്ത് "Add to Home Screen" നൽകുക.'
                    : 'Tap the Share icon at bottom and select "Add to Home Screen".'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
            >
              {lang === 'ml' ? 'മനസ്സിലായി' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations, TranslationKey } from './translations';
import { Languages } from 'lucide-react';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('ml'); // Default to Malayalam as requested, easily toggleable to English

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fleetflow_lang') as Language;
      if (saved && (saved === 'en' || saved === 'ml')) {
        setLangState(saved);
      }
    } catch (e) {
      console.warn('Failed to read language preference:', e);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem('fleetflow_lang', newLang);
    } catch (e) {
      console.warn('Failed to persist language preference:', e);
    }
  };

  const toggleLang = () => {
    const next = lang === 'ml' ? 'en' : 'ml';
    setLang(next);
  };

  const t = (key: TranslationKey): string => {
    const dict = translations[lang] || translations.en;
    return dict[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Compact, touch-friendly Language Switcher Pill for Headers and Mobile Bars
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={`inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/90 text-xs font-bold ${className}`}
    >
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
          lang === 'en'
            ? 'bg-blue-600 text-white shadow-xs font-black'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('ml')}
        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
          lang === 'ml'
            ? 'bg-blue-600 text-white shadow-xs font-black'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        മലയാളം
      </button>
    </div>
  );
}

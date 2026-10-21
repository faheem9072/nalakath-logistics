'use client';

import React, { createContext, useContext, useState } from 'react';
import { Language, translations, TranslationKey } from './translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // English only across entire application
  const [lang] = useState<Language>('en');

  const setLang = (_newLang: Language) => {
    // English only
  };

  const toggleLang = () => {
    // English only
  };

  const t = (key: TranslationKey): string => {
    return translations.en[key] || key;
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

// Language switcher disabled / returns null for clean English-only UI
export function LanguageSwitcher(_props: { className?: string }) {
  return null;
}

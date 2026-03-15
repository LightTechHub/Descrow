// src/components/LanguageSwitcher.jsx
import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import i18next from 'i18next';

const languages = [
  { code: 'en', name: 'English',    emoji: '🇺🇸' },
  { code: 'es', name: 'Español',    emoji: '🇪🇸' },
  { code: 'fr', name: 'Français',   emoji: '🇫🇷' },
  { code: 'de', name: 'Deutsch',    emoji: '🇩🇪' },
  { code: 'zh', name: '中文',       emoji: '🇨🇳' },
  { code: 'ru', name: 'Русский',    emoji: '🇷🇺' },
  { code: 'ar', name: 'العربية',   emoji: '🇸🇦' },
  { code: 'pt', name: 'Português',  emoji: '🇧🇷' },
  { code: 'ja', name: '日本語',     emoji: '🇯🇵' },
  { code: 'hi', name: 'हिन्दी',    emoji: '🇮🇳' },
];

const LanguageSwitcher = () => {
  const [open, setOpen] = useState(false);

  // Initialise from i18next current language, fall back to 'en'
  const getCurrentLang = () => {
    const code = i18next.language?.split('-')[0] || 'en';
    return languages.find(l => l.code === code) || languages[0];
  };

  const [selected, setSelected] = useState(getCurrentLang);

  // Keep in sync if i18next language changes externally (e.g. browser detection)
  useEffect(() => {
    const handler = (lng) => {
      const code = lng?.split('-')[0];
      const match = languages.find(l => l.code === code);
      if (match) setSelected(match);
    };
    i18next.on('languageChanged', handler);
    return () => i18next.off('languageChanged', handler);
  }, []);

  const handleSelect = async (lang) => {
    setSelected(lang);
    setOpen(false);
    try {
      await i18next.changeLanguage(lang.code);
      // Persist selection so page reloads remember it
      localStorage.setItem('i18nextLng', lang.code);
      // RTL support for Arabic
      document.documentElement.dir = lang.code === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang.code;
    } catch (err) {
      console.error('Language switch failed:', err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
      >
        <span className="text-xl" role="img" aria-label={selected.name}>{selected.emoji}</span>
        <span className="text-sm text-gray-700 dark:text-gray-300 transition-colors duration-300 hidden sm:inline">
          {selected.name}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />

          {/* Dropdown */}
          <ul
            role="listbox"
            aria-label="Language options"
            className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-20 transition-colors duration-300 max-h-80 overflow-y-auto"
          >
            {languages.map((lang) => (
              <li key={lang.code} role="option" aria-selected={selected.code === lang.code}>
                <button
                  onClick={() => handleSelect(lang)}
                  className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-left ${
                    selected.code === lang.code
                      ? 'bg-blue-50 dark:bg-blue-900/20 font-semibold'
                      : ''
                  }`}
                >
                  <span className="text-xl" role="img" aria-label={lang.name}>{lang.emoji}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 transition-colors duration-300">
                    {lang.name}
                  </span>
                  {selected.code === lang.code && (
                    <span className="ml-auto text-blue-600 dark:text-blue-400 text-xs font-bold">✓</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;

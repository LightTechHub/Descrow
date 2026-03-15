// src/components/LanguageSwitcher.jsx
import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import i18next from 'i18next';

// Flag images via flagcdn.com - renders on ALL platforms including Windows
const languages = [
  { code: 'en', name: 'English',   flag: 'us' },
  { code: 'es', name: 'Espanol',   flag: 'es' },
  { code: 'fr', name: 'Francais',  flag: 'fr' },
  { code: 'de', name: 'Deutsch',   flag: 'de' },
  { code: 'zh', name: 'Chinese',   flag: 'cn' },
  { code: 'ru', name: 'Russian',   flag: 'ru' },
  { code: 'ar', name: 'Arabic',    flag: 'sa' },
  { code: 'pt', name: 'Portugues', flag: 'br' },
  { code: 'ja', name: 'Japanese',  flag: 'jp' },
  { code: 'hi', name: 'Hindi',     flag: 'in' },
];

const FlagImg = ({ flag, name }) => (
  <img
    src={`https://flagcdn.com/24x18/${flag}.png`}
    srcSet={`https://flagcdn.com/48x36/${flag}.png 2x`}
    width="24"
    height="18"
    alt={name}
    className="rounded-sm flex-shrink-0"
    style={{ objectFit: 'cover' }}
  />
);

const LanguageSwitcher = () => {
  const [open, setOpen] = useState(false);

  const getCurrentLang = () => {
    const code = i18next.language?.split('-')[0] || 'en';
    return languages.find(l => l.code === code) || languages[0];
  };

  const [selected, setSelected] = useState(getCurrentLang);

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
      localStorage.setItem('i18nextLng', lang.code);
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
        <FlagImg flag={selected.flag} name={selected.name} />
        <span className="text-sm text-gray-700 dark:text-gray-300 transition-colors duration-300 hidden sm:inline">
          {selected.name}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <ul
            role="listbox"
            aria-label="Language options"
            className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-20 max-h-80 overflow-y-auto"
          >
            {languages.map((lang) => (
              <li key={lang.code} role="option" aria-selected={selected.code === lang.code}>
                <button
                  onClick={() => handleSelect(lang)}
                  className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-left ${
                    selected.code === lang.code ? 'bg-blue-50 dark:bg-blue-900/20 font-semibold' : ''
                  }`}
                >
                  <FlagImg flag={lang.flag} name={lang.name} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{lang.name}</span>
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

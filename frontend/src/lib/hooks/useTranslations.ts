import { useState, useEffect } from 'react';

// Import locale files
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import ht from '../../locales/ht.json';

const locales = { en, es, ht };

// Helper hook for translations
const useTranslations = () => {
  const [currentLocale, setCurrentLocale] = useState('en');

  useEffect(() => {
    const pathSegments = window.location.pathname.split('/');
    const localeFromPath = pathSegments[1];
    if (locales[localeFromPath as keyof typeof locales]) {
      setCurrentLocale(localeFromPath);
    } else {
      setCurrentLocale('en'); // Fallback
    }
  }, []);

  const t = locales[currentLocale as keyof typeof locales];
  return { t, currentLocale };
};

export default useTranslations;

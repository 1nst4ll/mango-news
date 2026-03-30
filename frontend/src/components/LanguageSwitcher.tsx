import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Globe, Loader2 } from 'lucide-react';
import useTranslations from '../lib/hooks/useTranslations';

interface Language {
  code: string;
  name: string;
  flag: string; // Path to flag image
}

const languages: Language[] = [
  { code: 'en', name: 'English', flag: '/gb-sm.png' }, // Great Britain flag for English
  { code: 'es', name: 'Español', flag: '/es-sm.png' }, // Spain flag for Spanish
  { code: 'ht', name: 'Kreyòl Ayisyen', flag: '/ht-sm.png' }, // Haiti flag for Haitian Creole
];

const LanguageSwitcher: React.FC = () => {
  const [currentLocale, setCurrentLocale] = useState('en');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslations();

  useEffect(() => {
    // Get the current locale from the URL path (Astro i18n prefix)
    const pathSegments = window.location.pathname.split('/');
    const localeFromPath = pathSegments[1]; // e.g., 'en', 'es', 'ht'

    // Check if the locale from path is one of our supported locales
    if (languages.some(lang => lang.code === localeFromPath)) {
      setCurrentLocale(localeFromPath);
    } else {
      // Fallback to default if no valid locale in path (e.g., on root /)
      setCurrentLocale('en');
    }
  }, []);

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === currentLocale) {
      setIsPopoverOpen(false);
      return;
    }

    // Construct the new URL with the selected locale prefix
    const currentPath = window.location.pathname;
    const pathSegments = currentPath.split('/').filter(segment => segment !== ''); // Remove empty segments

    let newPath = '';
    if (pathSegments.length > 0 && languages.some(lang => lang.code === pathSegments[0])) {
      // Replace existing locale prefix
      pathSegments[0] = newLocale;
      newPath = `/${pathSegments.join('/')}${window.location.search}${window.location.hash}`;
    } else {
      // Add locale prefix if not present (e.g., from / to /es/)
      newPath = `/${newLocale}${currentPath}${window.location.search}${window.location.hash}`;
    }

    // Store preference in localStorage and cookie for server-side detection
    localStorage.setItem('preferredLocale', newLocale);
    document.cookie = `preferredLocale=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;

    // Show loading state and navigate
    setIsLoading(true);
    setIsPopoverOpen(false);
    window.location.href = newPath;
  };

  const currentLanguage = languages.find(lang => lang.code === currentLocale) || languages[0]; // Fallback to English

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <img src={currentLanguage.flag} alt={currentLanguage.name} className="h-5 w-5" />
          )}
          <span className="sr-only">{t.change_language || 'Change language'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="grid gap-1">
          {languages.map((lang) => (
            <Button
              key={lang.code}
              variant="ghost"
              className="justify-start"
              onClick={() => handleLanguageChange(lang.code)}
            >
              <img src={lang.flag} alt={lang.name} className="h-5 w-5 mr-2" />
              <span lang={lang.code}>{lang.name}</span>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LanguageSwitcher;

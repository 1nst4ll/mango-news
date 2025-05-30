import React, { useState, useEffect } from 'react';
import { navItems } from '../lib/nav-items';
import { ModeToggle } from './ModeToggle';
import { LoginButton } from './LoginButton';
import LanguageSwitcher from './LanguageSwitcher';
import { Rss, Menu, X } from 'lucide-react';

// Import locale files
import en from '../locales/en.json';
import es from '../locales/es.json';
import ht from '../locales/ht.json';

const locales = { en, es, ht };

// Helper hook for translations (can be refactored into a shared utility later)
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


const Header: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t, currentLocale } = useTranslations(); // Use the translation hook

  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    setIsLoggedIn(!!token);
  }, []);

  const filteredNavItems = navItems.filter(item =>
    item.titleKey !== 'settings' || isLoggedIn // Use titleKey for filtering
  );

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="bg-sidebar text-sidebar-foreground p-4 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        {/* Mobile Header Layout */}
        <div className="md:hidden flex w-full justify-between items-center">
          {/* Left: Hamburger Icon */}
          <div className="flex-none">
            <button onClick={toggleMobileMenu} className="text-sidebar-foreground focus:outline-none">
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          {/* Center: Logo */}
          <div className="flex-grow flex justify-center">
            <a href="/">
              <img src="/logo.png" alt="Mango News Logo" className="h-8" />
            </a>
          </div>
          {/* Right: Login, Mode Toggle, and Language Switcher */}
          <div className="flex-none flex items-center space-x-2">
            <LoginButton isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
            <ModeToggle />
            <LanguageSwitcher /> {/* Add LanguageSwitcher for mobile */}
          </div>
        </div>

        {/* Desktop Header Layout */}
        {/* Desktop Logo (Left) */}
        <div className="hidden md:flex">
          <a href="/">
            <img src="/logo.png" alt="Mango News Logo" className="h-8" />
            </a>
        </div>
        {/* Desktop Navigation (Center) */}
          <nav className="hidden md:block">
            <ul className="flex space-x-4 items-center">
              {filteredNavItems.map(item => (
                <li key={item.href}>
                  <a 
                    href={item.href.startsWith('http') ? item.href : `/${currentLocale}${item.href}`} 
                    className="hover:underline flex items-center space-x-1"
                  >
                    {item.titleKey === "rss_feed" && <Rss className="h-4 w-4" />}
                    <span>{t[item.titleKey as keyof typeof t]}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        {/* Desktop Login, Mode Toggle, and Language Switcher (Right) */}
        <div className="hidden md:flex items-center space-x-4">
          <LoginButton isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
          <ModeToggle />
          <LanguageSwitcher /> {/* Add LanguageSwitcher for desktop */}
        </div>
      </div>

      {/* Mobile Navigation Menu (Dropdown - only nav items) */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-sidebar shadow-lg z-40">
          <nav className="container mx-auto py-2">
            <ul className="flex flex-col space-y-2">
              {filteredNavItems.map(item => (
                <li key={item.href}>
                  <a 
                    href={item.href.startsWith('http') ? item.href : `/${currentLocale}${item.href}`} 
                    className="block px-4 py-2 hover:bg-sidebar-muted hover:underline flex items-center space-x-1"
                    onClick={() => setIsMobileMenuOpen(false)} // Close menu on click
                  >
                    {item.titleKey === "rss_feed" && <Rss className="h-4 w-4" />}
                    <span>{t[item.titleKey as keyof typeof t]}</span>
                  </a>
                </li>
              ))}
            </ul>
            {/* LoginButton and ModeToggle removed from here as they are now in the main mobile header bar */}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;

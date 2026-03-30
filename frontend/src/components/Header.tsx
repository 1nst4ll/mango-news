import React, { useState, useEffect } from 'react';
import { navItems } from '../lib/nav-items';
import { ModeToggle } from './ModeToggle';
import { LoginButton } from './LoginButton';
import LanguageSwitcher from './LanguageSwitcher';
import { Button } from './ui/button';
import { Rss, Menu, X } from 'lucide-react';
import useTranslations from '../lib/hooks/useTranslations';


const Header: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t, currentLocale } = useTranslations(); // Use the translation hook

  useEffect(() => {
    const apiUrl = (import.meta.env.PUBLIC_API_URL as string | undefined) || 'http://localhost:3000';
    fetch(`${apiUrl}/api/me`, { credentials: 'include', cache: 'no-store' })
      .then(res => setIsLoggedIn(res.ok))
      .catch(() => setIsLoggedIn(false));
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
            <Button variant="ghost" size="icon" onClick={toggleMobileMenu} className="text-sidebar-foreground">
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              <span className="sr-only">{isMobileMenuOpen ? (t.close_menu || 'Close menu') : (t.open_menu || 'Open menu')}</span>
            </Button>
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
            <ul className="flex space-x-1 items-center">
              {filteredNavItems.map(item => (
                <li key={item.href}>
                  <Button asChild variant="ghost" size="sm">
                    <a href={item.href.startsWith('http') || item.href.startsWith('/api/') ? item.href : `/${currentLocale}${item.href}`}>
                      {item.titleKey === "rss_feed" && <Rss className="h-4 w-4" />}
                      <span>{t[item.titleKey as keyof typeof t] as string}</span>
                    </a>
                  </Button>
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
                  <Button asChild variant="ghost" className="w-full justify-start" onClick={() => setIsMobileMenuOpen(false)}>
                    <a href={item.href.startsWith('http') || item.href.startsWith('/api/') ? item.href : `/${currentLocale}${item.href}`}>
                      {item.titleKey === "rss_feed" && <Rss className="h-4 w-4" />}
                      <span>{t[item.titleKey as keyof typeof t] as string}</span>
                    </a>
                  </Button>
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

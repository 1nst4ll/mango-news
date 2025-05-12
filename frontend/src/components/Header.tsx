import React, { useState, useEffect } from 'react';
import { navItems } from '../lib/nav-items';
import { ModeToggle } from './ModeToggle';
import { LoginButton } from './LoginButton';
import { Rss, Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    setIsLoggedIn(!!token);
  }, []);

  const filteredNavItems = navItems.filter(item =>
    item.title !== 'Settings' || isLoggedIn
  );

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="bg-sidebar text-sidebar-foreground p-4 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <div>
          <a href="/">
            <img src="/logo.png" alt="Mango News Logo" className="h-8" />
          </a>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:block">
          <ul className="flex space-x-4 items-center">
            {filteredNavItems.map(item => (
              <li key={item.href}>
                <a href={item.href} className="hover:underline flex items-center space-x-1">
                  {item.title === "RSS Feed" && <Rss className="h-4 w-4" />}
                  <span>{item.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Login and Mode Toggle - Desktop */}
        <div className="hidden md:flex items-center space-x-4">
          <LoginButton isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
          <ModeToggle />
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <button onClick={toggleMobileMenu} className="text-sidebar-foreground focus:outline-none">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-sidebar shadow-lg z-40">
          <nav className="container mx-auto py-2">
            <ul className="flex flex-col space-y-2">
              {filteredNavItems.map(item => (
                <li key={item.href}>
                  <a 
                    href={item.href} 
                    className="block px-4 py-2 hover:bg-sidebar-muted hover:underline flex items-center space-x-1"
                    onClick={() => setIsMobileMenuOpen(false)} // Close menu on click
                  >
                    {item.title === "RSS Feed" && <Rss className="h-4 w-4" />}
                    <span>{item.title}</span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="px-4 py-2 mt-2 border-t border-border">
              <div className="flex flex-col space-y-4">
                <LoginButton isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
                <ModeToggle />
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;

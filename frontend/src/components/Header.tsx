import React, { useState, useEffect } from 'react';
import { navItems } from '../lib/nav-items'; // Changed to relative path
import { ModeToggle } from './ModeToggle'; // Import the ModeToggle component
import { LoginButton } from './LoginButton'; // Import the LoginButton component
import { Rss } from 'lucide-react'; // Import the Rss icon

const Header: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check for JWT token in localStorage on component mount
    const token = localStorage.getItem('jwtToken');
    setIsLoggedIn(!!token); // Set isLoggedIn to true if token exists
  }, []);

  // Filter navItems to hide 'Settings' if not logged in
  const filteredNavItems = navItems.filter(item =>
    item.title !== 'Settings' || isLoggedIn
  );

  return (
    <header className="bg-sidebar text-sidebar-foreground p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div>
          <a href="/">
            <img src="/logo.png" alt="Mango News Logo" className="h-8" />
          </a>
        </div>
        <nav>
          <ul className="flex space-x-4 items-center"> {/* Added items-center for vertical alignment */}
            {filteredNavItems.map(item => (
              <li key={item.href}>
                <a href={item.href} className="hover:underline flex items-center space-x-1"> {/* Flex for icon and text */}
                  {item.title === "RSS Feed" && <Rss className="h-4 w-4" />} {/* Add RSS icon */}
                  <span>{item.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center space-x-4"> {/* Container for Login and ModeToggle */}
          <LoginButton isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} /> {/* Pass isLoggedIn state and setter */}
          <ModeToggle /> {/* Add the ModeToggle component here */}
        </div>
      </div>
    </header>
  );
};

export default Header;

import React from 'react';
import { navItems } from '../lib/nav-items'; // Changed to relative path
import { ModeToggle } from './ModeToggle'; // Import the ModeToggle component
import { Rss } from 'lucide-react'; // Import the Rss icon

const Header: React.FC = () => {
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
            {navItems.map(item => (
              <li key={item.href}>
                <a href={item.href} className="hover:underline flex items-center space-x-1"> {/* Flex for icon and text */}
                  {item.title === "RSS Feed" && <Rss className="h-4 w-4" />} {/* Add RSS icon */}
                  <span>{item.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        {/* Placeholder for potential future elements */}
        <div>
          <ModeToggle /> {/* Add the ModeToggle component here */}
        </div>
      </div>
    </header>
  );
};

export default Header;

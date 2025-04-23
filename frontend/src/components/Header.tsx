'use client';

import React from 'react';
import Link from 'next/link';
import { navItems } from '@/lib/nav-items';

const Header: React.FC = () => {
  return (
    <header>
      <div>
        <Link href="/">
          <img src="/logo.png" alt="Mango News Logo" /> {/* Adjust height as needed */}
        </Link>
      </div>
      <div>
        {/* Desktop navigation */}
        <nav>
          <ul>
            {navItems.map(item => (
              <li key={item.href}>
                <Link href={item.href}>{item.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* Add SidebarTrigger for mobile/collapsible state if needed later */}
        <div>
        </div>
      </div>
    </header>
  );
};

export default Header;

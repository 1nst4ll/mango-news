'use client';

import React from 'react';
import Link from 'next/link';
import { navItems } from '@/lib/nav-items';

const Header: React.FC = () => {
  return (
    <header>
      <div>
        <Link href="/">
          <img src="/logo.png" alt="Mango News Logo" />
        </Link>
      </div>
      <div>
        <nav>
          <ul>
            {navItems.map(item => (
              <li key={item.href}>
                <Link href={item.href}>{item.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
        </div>
      </div>
    </header>
  );
};

export default Header;

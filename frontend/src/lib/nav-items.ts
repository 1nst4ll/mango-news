import { Home, Settings, List } from 'lucide-react';

export interface NavItem {
  href: string;
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export const navItems: NavItem[] = [
  { href: "/", title: "Home", icon: Home },
  { href: "/admin", title: "Admin", icon: Settings },
  { href: "/admin/sources", title: "Manage Sources", icon: List },
];

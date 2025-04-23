export interface NavItem {
  href: string;
  title: string;
}

export const navItems: NavItem[] = [
  { href: "/", title: "Home" },
  { href: "/admin", title: "Admin" },
  { href: "/admin/sources", title: "Manage Sources" },
];

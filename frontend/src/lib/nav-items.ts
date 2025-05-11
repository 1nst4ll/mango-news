// Defines the navigation items for the frontend.
export interface NavItem {
  href: string;
  title: string;
}

export const navItems: NavItem[] = [
  { href: "/", title: "Home" },
  { href: "/settings", title: "Settings" },
  { href: "/api/rss", title: "RSS Feed" }, // Link to the backend RSS feed endpoint
];

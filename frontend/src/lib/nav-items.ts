// Defines the navigation items for the frontend.
export interface NavItem {
  href: string;
  titleKey: string; // Use a key for translation
}

export const navItems: NavItem[] = [
  { href: "/", titleKey: "news" },
  { href: "/sunday-edition", titleKey: "sunday_edition" },
  { href: "/api/rss", titleKey: "rss_feed" }
];

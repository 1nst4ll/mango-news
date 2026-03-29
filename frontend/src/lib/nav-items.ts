// Defines the navigation items for the frontend.
export interface NavItem {
  href: string;
  titleKey: string; // Use a key for translation
}

export const navItems: NavItem[] = [
  { href: "https://mango.tc/", titleKey: "home" },
  { href: "https://mango.tc/listings/?category=automoto-en&pagination=1&sort-by=most-relevant&view=card", titleKey: "vehicles" },
  { href: "https://mango.tc/listings/?category=real-estate", titleKey: "real_estate" },
  { href: "https://mango.tc/listings/?category=jobs", titleKey: "jobs" },
  { href: "/", titleKey: "news" },
  { href: "/api/rss", titleKey: "rss_feed" }
];

// Defines the navigation items for the frontend.
export interface NavItem {
  href: string;
  title: string;
}

export const navItems: NavItem[] = [
  { href: "https://mango.tc/", title: "Home" },
  { href: "https://mango.tc/listings/?category=automoto-en&pagination=1&sort-by=most-relevant&view=card", title: "Automoto" },
  { href: "https://mango.tc/listings/?category=real-estate", title: "Real Estate" },
  { href: "https://mango.tc/listings/?category=jobs", title: "Jobs" },
];

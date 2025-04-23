import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Footer from "@/components/footer"; // Import Footer component
import { Sidebar } from "@/components/sidebar"; // Import Sidebar component

export const metadata: Metadata = {
  title: "Mango News",
  description: "Turks and Caicos News Aggregator",
};

const navItems = [
  { href: "/", title: "Home" },
  { href: "/admin", title: "Admin" },
  { href: "/admin/sources", title: "Manage Sources" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;700&display=swap" />
        {/* Assuming Uni Neue is available via a similar service or locally.
            If not available via a public CDN, it would need to be added locally.
            For now, adding a placeholder link. Replace with actual Uni Neue link if available. */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Uni+Neue:wght@700&display=swap" />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen bg-background text-foreground">
            {/* Sidebar */}
            <Sidebar items={navItems} className="w-64 border-r border-border" />

            <div className="flex flex-col flex-1">
              <header className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-4 border-b border-border">
                <div className="flex items-center">
                   {/* Mobile sidebar trigger - hidden on large screens */}
                  <div className="lg:hidden mr-4">
                     <Sidebar items={navItems} />
                  </div>
                  <Link href="/">
                    <img src="/logo.png" alt="Mango News Logo" className="h-10" /> {/* Adjust height as needed */}
                  </Link>
                </div>
                <div className="flex items-center space-x-4">
                   {/* Desktop navigation - hidden on large screens, sidebar is used */}
                   <nav className="hidden lg:block">
                    <ul className="flex space-x-4">
                      {navItems.map(item => (
                         <li key={item.href}>
                           <Link href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">{item.title}</Link>
                         </li>
                      ))}
                    </ul>
                   </nav>
                  <ThemeSwitcher />
                </div>
              </header>
              <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
                {children}
              </main>
              <Footer /> {/* Add Footer component */}
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

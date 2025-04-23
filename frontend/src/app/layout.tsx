import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Footer from "@/components/footer"; // Import Footer component

export const metadata: Metadata = {
  title: "Mango News",
  description: "Turks and Caicos News Aggregator",
};

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
          <div className="flex flex-col min-h-screen bg-background text-foreground">
            <header className="flex flex-col sm:flex-row justify-between items-center px-4 sm:px-6 lg:px-8 py-4 border-b border-border">
              <div className="mb-4 sm:mb-0">
                <Link href="/">
                  <img src="/logo.png" alt="Mango News Logo" className="h-10" /> {/* Adjust height as needed */}
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <nav>
                  <ul className="flex space-x-4">
                    <li><Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link></li> {/* Added Home link */}
                    <li><Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">Admin</Link></li>
                    <li><Link href="/admin/sources" className="text-muted-foreground hover:text-foreground transition-colors">Manage Sources</Link></li> {/* Added Manage Sources link */}
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
        </ThemeProvider>
      </body>
    </html>
  );
}

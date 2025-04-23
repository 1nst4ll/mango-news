export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
      </head>
      <body>
          {children}
      </body>
    </html>
  );
}

// navItems, ThemeSwitcher, SidebarTrigger, and Footer are now imported directly in pages that need them.

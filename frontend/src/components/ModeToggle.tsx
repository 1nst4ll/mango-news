import * as React from "react"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ModeToggle() {
  const [theme, setThemeState] = React.useState<"theme-light" | "dark">(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains("dark") ? "dark" : "theme-light";
    }
    return "theme-light";
  })

  React.useEffect(() => {
    const isDark = theme === "dark"
    document.documentElement.classList[isDark ? "add" : "remove"]("dark")
  }, [theme])

  const toggleTheme = () => {
    setThemeState((prevTheme) => (prevTheme === "dark" ? "theme-light" : "dark"))
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
    >
      {/* Show Moon in light mode, Sun in dark mode */}
      <Moon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Sun className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyTheme, readTheme, type Theme } from "./theme";

/** Light / dark switch. Icon + text, and `aria-pressed` tells assistive tech the current state. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  // The theme is set by the inline script before hydration, so read it after mount.
  useEffect(() => setTheme(readTheme()), []);

  const dark = theme === "dark";
  const toggle = () => {
    const next: Theme = dark ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  return (
    <Button type="button" variant="ghost" size="sm" onClick={toggle} aria-pressed={dark} disabled={theme === null}>
      {dark ? <Moon aria-hidden /> : <Sun aria-hidden />}
      <span>Dark mode</span>
    </Button>
  );
}

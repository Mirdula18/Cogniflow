export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "cogniflow-theme";

/**
 * Runs before first paint (inlined in the root layout) so the stored or system
 * theme is applied without a light-mode flash. Kept dependency-free on purpose.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})();`;

export function readTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Applies the theme with Tailwind's `class` strategy and remembers it for this browser. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this page.
  }
}

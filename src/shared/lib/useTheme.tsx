"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Dark/light theme context — verbatim port of `src/shared/lib/useTheme.ts`.
 *
 * The Vue kit toggled the `dark` class on `<html>` and defaulted to dark
 * (the dither aesthetic). This port keeps the same behaviour and exposes a
 * React context + provider so any client component can read/toggle theme.
 */

export interface ThemeContextValue {
  /** True when the `dark` class is on `<html>`. Defaults to `true`. */
  dark: boolean;
  /** Flip `dark` and apply the class to `<html>`. */
  toggle: () => void;
  /** Explicitly set the theme. */
  setDark: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Initial theme; defaults to dark (the dither aesthetic). */
  defaultDark?: boolean;
}

export function ThemeProvider({ children, defaultDark = true }: ThemeProviderProps) {
  const [dark, setDark] = useState<boolean>(defaultDark);

  const apply = useCallback((isDark: boolean) => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  // Apply on mount (mirrors Vue's `onMounted(apply)`).
  useEffect(() => {
    apply(dark);
  }, [dark, apply]);

  const toggle = useCallback(() => {
    setDark((d) => !d);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ dark, toggle, setDark }),
    [dark, toggle],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>.");
  return ctx;
}

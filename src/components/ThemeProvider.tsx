"use client";

import { useEffect } from "react";
import { getThemeVars, themes, useThemeStore } from "@/store/themeStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeId = useThemeStore((state) => state.themeId);
  const mode = useThemeStore((state) => state.mode);
  const hydrate = useThemeStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const root = document.documentElement;
    const vars = getThemeVars(themeId, mode);

    root.dataset.theme = `${themeId}-${mode}`;
    root.dataset.mode = mode;
    root.style.colorScheme = mode;

    for (const [name, value] of Object.entries(vars)) {
      root.style.setProperty(name, value);
    }

    root.style.setProperty("--theme-vibe", `"${themes[themeId].vibe}"`);
  }, [mode, themeId]);

  return children;
}

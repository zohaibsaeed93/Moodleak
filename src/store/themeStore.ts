"use client";

import { create } from "zustand";

export type ThemeMode = "dark" | "light";

type ThemeVars = {
  "--bg-base": string;
  "--bg-surface": string;
  "--bg-elevated": string;
  "--border": string;
  "--text-primary": string;
  "--text-secondary": string;
  "--text-muted": string;
  "--accent": string;
  "--accent-dim": string;
  "--accent-text": string;
};

export type ThemeConfig = {
  id: string;
  name: string;
  mode: ThemeMode;
  accent: string;
  accentName: string;
  vibe: string;
  vars: Record<ThemeMode, ThemeVars>;
};

const darkBase = {
  "--bg-base": "#080A0C",
  "--bg-surface": "rgba(18, 21, 24, 0.74)",
  "--bg-elevated": "rgba(32, 37, 42, 0.82)",
  "--border": "rgba(235, 241, 245, 0.12)",
  "--text-primary": "#F5F7F4",
  "--text-secondary": "rgba(245, 247, 244, 0.72)",
  "--text-muted": "rgba(245, 247, 244, 0.42)",
};

const lightBase = {
  "--bg-base": "#F4F0E8",
  "--bg-surface": "rgba(255, 252, 246, 0.78)",
  "--bg-elevated": "rgba(245, 238, 229, 0.9)",
  "--border": "rgba(40, 37, 32, 0.12)",
  "--text-primary": "#191713",
  "--text-secondary": "rgba(25, 23, 19, 0.68)",
  "--text-muted": "rgba(25, 23, 19, 0.42)",
};

function withAccent(
  base: typeof darkBase,
  accent: string,
  accentText = accent,
): ThemeVars {
  return {
    ...base,
    "--accent": accent,
    "--accent-dim": `${accent}33`,
    "--accent-text": accentText,
  };
}

export const themes = {
  obsidian: {
    id: "obsidian",
    name: "Obsidian",
    mode: "dark",
    accent: "#7EB8B0",
    accentName: "Muted teal",
    vibe: "default",
    vars: {
      dark: withAccent(darkBase, "#7EB8B0"),
      light: withAccent(lightBase, "#5D9D95"),
    },
  },
  dusk: {
    id: "dusk",
    name: "Dusk",
    mode: "dark",
    accent: "#C4A882",
    accentName: "Warm sand",
    vibe: "warm noir",
    vars: {
      dark: withAccent(
        {
          ...darkBase,
          "--bg-base": "#0D0B0A",
          "--bg-surface": "rgba(27, 22, 19, 0.76)",
          "--bg-elevated": "rgba(42, 35, 29, 0.84)",
        },
        "#C4A882",
      ),
      light: withAccent(lightBase, "#A98055"),
    },
  },
  void: {
    id: "void",
    name: "Void",
    mode: "dark",
    accent: "#9B8FD4",
    accentName: "Soft violet",
    vibe: "deep space",
    vars: {
      dark: withAccent(
        {
          ...darkBase,
          "--bg-base": "#07070F",
          "--bg-surface": "rgba(17, 17, 30, 0.76)",
          "--bg-elevated": "rgba(31, 29, 51, 0.84)",
        },
        "#9B8FD4",
      ),
      light: withAccent(lightBase, "#7768B8"),
    },
  },
  linen: {
    id: "linen",
    name: "Linen",
    mode: "light",
    accent: "#D4896A",
    accentName: "Terracotta",
    vibe: "warm studio",
    vars: {
      dark: withAccent(darkBase, "#D4896A"),
      light: withAccent(
        {
          ...lightBase,
          "--bg-base": "#F5EFE6",
          "--bg-surface": "rgba(255, 250, 243, 0.8)",
          "--bg-elevated": "rgba(242, 231, 219, 0.92)",
        },
        "#D4896A",
      ),
    },
  },
  frost: {
    id: "frost",
    name: "Frost",
    mode: "light",
    accent: "#6A9FB5",
    accentName: "Slate blue",
    vibe: "crisp clean",
    vars: {
      dark: withAccent(darkBase, "#80AFC0"),
      light: withAccent(
        {
          ...lightBase,
          "--bg-base": "#EEF3F2",
          "--bg-surface": "rgba(252, 254, 253, 0.82)",
          "--bg-elevated": "rgba(229, 237, 237, 0.94)",
        },
        "#6A9FB5",
      ),
    },
  },
  sage: {
    id: "sage",
    name: "Sage",
    mode: "light",
    accent: "#7FAF8A",
    accentName: "Muted green",
    vibe: "organic calm",
    vars: {
      dark: withAccent(darkBase, "#8DBB96"),
      light: withAccent(
        {
          ...lightBase,
          "--bg-base": "#EEF2E9",
          "--bg-surface": "rgba(252, 253, 247, 0.82)",
          "--bg-elevated": "rgba(229, 237, 224, 0.94)",
        },
        "#7FAF8A",
      ),
    },
  },
} satisfies Record<string, ThemeConfig>;

export type ThemeId = keyof typeof themes;

type ThemeState = {
  themeId: ThemeId;
  mode: ThemeMode;
  setTheme: (themeId: ThemeId) => void;
  setMode: (mode: ThemeMode) => void;
  hydrate: () => void;
};

const STORAGE_KEY = "moodleak-theme";

function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && value in themes;
}

function isMode(value: unknown): value is ThemeMode {
  return value === "dark" || value === "light";
}

export function getThemeVars(themeId: ThemeId, mode: ThemeMode) {
  return themes[themeId].vars[mode];
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeId: "obsidian",
  mode: "dark",
  setTheme: (themeId) => {
    const mode = themes[themeId].mode;
    set({ themeId, mode });
    persistTheme(themeId, mode);
  },
  setMode: (mode) => {
    set({ mode });
    persistTheme(get().themeId, mode);
  },
  hydrate: () => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as {
        themeId?: unknown;
        mode?: unknown;
      };

      if (isThemeId(parsed.themeId) && isMode(parsed.mode)) {
        set({ themeId: parsed.themeId, mode: parsed.mode });
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  },
}));

function persistTheme(themeId: ThemeId, mode: ThemeMode) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeId, mode }));
}

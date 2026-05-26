"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type BackgroundMode = "none" | "blur" | "color" | "image";

type BackgroundStore = {
  mode: BackgroundMode;
  blurAmount: number;
  color: string;
  imageUrl: string | null;
  setMode: (mode: BackgroundMode) => void;
  setBlurAmount: (amount: number) => void;
  setColor: (color: string) => void;
  setImageUrl: (url: string | null) => void;
};

const STORAGE_KEY = "moodleak-background";

function clampBlur(amount: number) {
  return Math.min(40, Math.max(8, Math.round(amount)));
}

export const useBackgroundStore = create<BackgroundStore>()(
  persist(
    (set) => ({
      mode: "none",
      blurAmount: 16,
      color: "#0a0a0a",
      imageUrl: null,
      setMode: (mode) => set({ mode }),
      setBlurAmount: (amount) => set({ blurAmount: clampBlur(amount) }),
      setColor: (color) => set({ color }),
      setImageUrl: (url) =>
        set({ imageUrl: url && url.trim() ? url.trim() : null }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ mode, blurAmount, color, imageUrl }) => ({
        mode,
        blurAmount,
        color,
        imageUrl,
      }),
    },
  ),
);

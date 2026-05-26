"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  type BackgroundMode,
  useBackgroundStore,
} from "@/store/backgroundStore";

const MODE_OPTIONS: Array<{ mode: BackgroundMode; label: string }> = [
  { mode: "none", label: "None" },
  { mode: "blur", label: "Blur" },
  { mode: "color", label: "Color" },
  { mode: "image", label: "Image" },
];

const COLOR_PRESETS = [
  "#0a0a0a",
  "#1a0a2e",
  "#0a1a2e",
  "#1a1a0a",
  "#2e0a0a",
  "#0a2e1a",
];

export function BackgroundSettings() {
  const mode = useBackgroundStore((state) => state.mode);
  const blurAmount = useBackgroundStore((state) => state.blurAmount);
  const color = useBackgroundStore((state) => state.color);
  const imageUrl = useBackgroundStore((state) => state.imageUrl);
  const setMode = useBackgroundStore((state) => state.setMode);
  const setBlurAmount = useBackgroundStore((state) => state.setBlurAmount);
  const setColor = useBackgroundStore((state) => state.setColor);
  const setImageUrl = useBackgroundStore((state) => state.setImageUrl);
  const [imageInput, setImageInput] = useState(imageUrl ?? "");
  const [imagePreviewOk, setImagePreviewOk] = useState(true);

  useEffect(() => {
    setImageInput(imageUrl ?? "");
  }, [imageUrl]);

  const validImageUrl = useMemo(() => {
    if (!imageUrl) {
      return null;
    }

    try {
      const parsed = new URL(imageUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
      }
      return imageUrl;
    } catch {
      return null;
    }
  }, [imageUrl]);

  const commitImageUrl = () => {
    setImageUrl(imageInput);
    setImagePreviewOk(true);
  };

  return (
    <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-4">
      <p className="font-mono text-[0.64rem] uppercase tracking-[0.22em] text-[var(--text-muted)]">
        Background
      </p>

      <div className="mt-3 grid grid-cols-4 gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] p-1">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.mode}
            type="button"
            className={`rounded-full px-2 py-2 font-display text-xs transition ${
              mode === option.mode
                ? "bg-[var(--bg-elevated)] text-[var(--accent-text)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
            onClick={() => setMode(option.mode)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === "blur" ? (
          <motion.div
            key="blur"
            className="mt-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <div className="mb-2 flex items-center justify-between font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              <span>Intensity</span>
              <span>{blurAmount}</span>
            </div>
            <input
              type="range"
              min={8}
              max={40}
              step={1}
              value={blurAmount}
              onChange={(event) => setBlurAmount(Number(event.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--bg-elevated)]"
            />
          </motion.div>
        ) : null}

        {mode === "color" ? (
          <motion.div
            key="color"
            className="mt-4 space-y-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Palette
            </p>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-label={`Select ${preset}`}
                  className={`h-7 w-full rounded-md border transition ${
                    color.toLowerCase() === preset
                      ? "border-[var(--accent)] ring-1 ring-[var(--accent-dim)]"
                      : "border-[var(--border)]"
                  }`}
                  style={{ backgroundColor: preset }}
                  onClick={() => setColor(preset)}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-2">
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-8 w-9 cursor-pointer rounded border border-[var(--border)] bg-transparent p-0"
                aria-label="Custom background color"
              />
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Custom
              </span>
            </div>
          </motion.div>
        ) : null}

        {mode === "image" ? (
          <motion.div
            key="image"
            className="mt-4 space-y-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <label className="block font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Image URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                inputMode="url"
                placeholder="https://example.com/bg.jpg"
                value={imageInput}
                onChange={(event) => setImageInput(event.target.value)}
                onBlur={commitImageUrl}
                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 font-mono text-[0.68rem] text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={commitImageUrl}
                className="rounded-lg border border-[var(--border)] px-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)]"
              >
                Set
              </button>
            </div>
            {validImageUrl && imagePreviewOk ? (
              <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]">
                <img
                  src={validImageUrl}
                  alt="Background preview"
                  className="h-16 w-full object-cover"
                  onError={() => setImagePreviewOk(false)}
                />
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { BackgroundSettings } from "@/components/BackgroundSettings";
import {
  type ThemeId,
  type ThemeMode,
  themes,
  useThemeStore,
} from "@/store/themeStore";

type SettingsPanelProps = {
  open: boolean;
  onClose: () => void;
};

const themeEntries = Object.values(themes);

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const themeId = useThemeStore((state) => state.themeId);
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const setTheme = useThemeStore((state) => state.setTheme);
  const activeTheme = themes[themeId];

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close settings"
            className="fixed inset-0 z-40 cursor-default bg-black/12 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[24rem] flex-col border-l border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-surface)_88%,transparent)] px-5 py-5 text-[var(--text-primary)] shadow-2xl shadow-black/20 backdrop-blur-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            style={{ willChange: "transform" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.26em] text-[var(--text-muted)]">
                  Appearance
                </p>
                <p className="mt-1 font-display text-xl text-[var(--text-primary)]">
                  {activeTheme.name}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close settings"
                className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                onClick={onClose}
              >
                <X size={17} strokeWidth={1.8} />
              </button>
            </div>

            <section className="mt-8">
              <div className="grid grid-cols-2 rounded-full border border-[var(--border)] bg-[var(--bg-base)] p-1">
                {(["dark", "light"] as ThemeMode[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`rounded-full px-5 py-3 font-display text-sm capitalize transition ${
                      mode === option
                        ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    }`}
                    onClick={() => setMode(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-8">
              <div className="grid grid-cols-3 gap-4">
                {themeEntries.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    aria-label={`Use ${theme.name} theme`}
                    className="group flex flex-col items-center gap-2"
                    onClick={() => setTheme(theme.id as ThemeId)}
                  >
                    <span
                      className={`relative grid h-14 w-14 place-items-center rounded-full border transition ${
                        theme.id === themeId
                          ? "border-[var(--accent)] ring-2 ring-[var(--accent-dim)]"
                          : "border-[var(--border)] group-hover:border-[var(--accent)]"
                      }`}
                    >
                      <span
                        className="h-10 w-10 overflow-hidden rounded-full shadow-inner"
                        style={{
                          background: `linear-gradient(90deg, #080A0C 0 50%, #F4F0E8 50% 100%)`,
                        }}
                      >
                        <span
                          className="block h-full w-full"
                          style={{
                            background: `radial-gradient(circle at center, ${theme.accent} 0 28%, transparent 30%)`,
                          }}
                        />
                      </span>
                    </span>
                    <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      {theme.name}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <BackgroundSettings />

            <div className="mt-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-4">
              <p className="font-mono text-[0.64rem] uppercase tracking-[0.22em] text-[var(--text-muted)]">
                Accent
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full shadow-[0_0_18px_var(--accent)]"
                  style={{ background: "var(--accent)" }}
                />
                <p className="font-display text-base text-[var(--accent-text)]">
                  {activeTheme.accentName}
                </p>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

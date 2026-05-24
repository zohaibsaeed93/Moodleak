"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  EVENT_NAMES,
  eventBus,
  type ReactionEventName,
  type ReactionEventPayload,
} from "@/lib/events/eventBus";
import {
  reactionRegistry,
  type ReactionConfig,
} from "@/lib/effects/effectRegistry";
import { startGestureEmitter } from "@/lib/gestures/gestureEmitter";

type ActiveReaction = {
  eventName: ReactionEventName;
  config: ReactionConfig;
  triggeredAt: number;
};

type HistoryItem = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  timestamp: number;
};

const HISTORY_LIMIT = 5;

export function ReactionPanel() {
  const [active, setActive] = useState<ActiveReaction | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const clearTimerRef = useRef<number | null>(null);

  const handleEvent = useCallback(
    (eventName: ReactionEventName, payload: ReactionEventPayload) => {
      const config = reactionRegistry[eventName];
      if (!config) {
        return;
      }

      setActive({
        eventName,
        config,
        triggeredAt: payload.timestamp,
      });

      const loggedAt = Date.now();
      setHistory((prev) => {
        const next: HistoryItem = {
          id: `${eventName}-${loggedAt}-${Math.random().toString(16).slice(2)}`,
          label: config.label,
          emoji: config.emoji,
          color: config.color,
          timestamp: loggedAt,
        };
        return [next, ...prev].slice(0, HISTORY_LIMIT);
      });

      if (clearTimerRef.current !== null) {
        window.clearTimeout(clearTimerRef.current);
      }

      clearTimerRef.current = window.setTimeout(() => {
        setActive(null);
      }, config.duration);
    },
    [],
  );

  useEffect(() => {
    const stopEmitter = startGestureEmitter();
    const handlers = new Map<
      ReactionEventName,
      (payload: ReactionEventPayload) => void
    >();

    for (const eventName of EVENT_NAMES) {
      const handler = (payload: ReactionEventPayload) =>
        handleEvent(eventName, payload);
      handlers.set(eventName, handler);
      eventBus.on(eventName, handler);
    }

    return () => {
      stopEmitter();
      for (const [eventName, handler] of handlers) {
        eventBus.off(eventName, handler);
      }
      if (clearTimerRef.current !== null) {
        window.clearTimeout(clearTimerRef.current);
      }
    };
  }, [handleEvent]);

  return (
    <aside className="theme-surface flex h-[320px] w-full flex-col gap-4 overflow-hidden rounded-2xl border p-4 shadow-2xl shadow-black/10 backdrop-blur-xl lg:h-full">
      <header className="flex items-center justify-between">
        <p className="font-mono text-[0.66rem] uppercase tracking-[0.28em] text-[var(--text-muted)]">
          current
        </p>
        <span
          className="h-2.5 w-2.5 rounded-full transition"
          style={{
            background: active ? "var(--accent)" : "var(--text-muted)",
            boxShadow: active ? "0 0 16px var(--accent)" : "none",
          }}
        />
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-4">
        <AnimatePresence mode="wait">
          {active ? (
            <motion.div
              key={`${active.eventName}-${active.triggeredAt}`}
              className="flex h-full w-full flex-col items-center justify-center gap-3 text-center"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <div
                className="pointer-events-none absolute inset-8 rounded-full blur-3xl"
                style={{ background: "var(--accent-dim)" }}
              />
              <div className="relative flex items-center gap-3">
                <span className="text-5xl leading-none">
                  {active.config.emoji}
                </span>
                <span className="font-display text-2xl font-semibold text-[var(--text-primary)]">
                  {active.config.label}
                </span>
              </div>
              <div className="relative h-32 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] sm:h-36">
                <ReactionMedia
                  src={active.config.gifUrl}
                  alt={active.config.label}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              className="relative grid h-full w-full place-items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.26 }}
            >
              <motion.div
                className="absolute h-28 w-28 rounded-full border border-[var(--accent)]"
                style={{ boxShadow: "0 0 46px var(--accent-dim)" }}
                animate={{
                  opacity: [0.18, 0.5, 0.18],
                  scale: [0.86, 1.08, 0.86],
                }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <div className="flex h-16 items-center gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
                  <motion.span
                    key={bar}
                    className="w-1 rounded-full bg-[var(--accent)]"
                    animate={{ height: [14, 42, 18, 30, 14] }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: bar * 0.09,
                    }}
                    style={{ opacity: 0.58 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <section className="flex min-h-24 flex-col gap-2">
        <div className="flex items-center justify-between font-mono text-[0.62rem] uppercase tracking-[0.24em] text-[var(--text-muted)]">
          <span>History</span>
          <span>last {HISTORY_LIMIT}</span>
        </div>
        <div className="min-h-0 overflow-auto pr-1">
          {history.length ? (
            <motion.ul className="space-y-1.5" layout>
              <AnimatePresence initial={false}>
                {history.map((item) => (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center justify-between gap-3 rounded-lg px-1.5 py-1.5 text-xs transition hover:bg-[var(--bg-elevated)]"
                  >
                    <div className="flex min-w-0 items-center gap-2 text-[var(--text-primary)]">
                      <span className="text-base text-[var(--accent-text)]">
                        {item.emoji}
                      </span>
                      <span className="truncate font-display text-sm">
                        {item.label}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-[0.62rem] text-[var(--text-muted)]">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          ) : (
            <div className="space-y-1.5" aria-hidden="true">
              {[0, 1, 2].map((row) => (
                <motion.div
                  key={row}
                  className="h-7 rounded-lg bg-[var(--bg-elevated)]"
                  animate={{ opacity: [0.16, 0.34, 0.16] }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: row * 0.16,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}

function ReactionMedia({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );

  return (
    <div className="relative h-full w-full">
      {status !== "loaded" ? (
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(110deg, var(--bg-surface), var(--bg-elevated), var(--bg-surface))",
            backgroundSize: "200% 100%",
          }}
          animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
      ) : null}

      {status !== "error" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`h-full w-full object-contain transition-opacity duration-300 ${
            status === "loaded" ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <motion.div
            className="h-16 w-16 rounded-full border border-[var(--accent)]"
            animate={{ opacity: [0.24, 0.56, 0.24], scale: [0.9, 1.05, 0.9] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}
    </div>
  );
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

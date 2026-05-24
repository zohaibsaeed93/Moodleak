"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  EVENT_NAMES,
  eventBus,
  type ReactionEventName,
  type ReactionEventPayload
} from "@/lib/events/eventBus";
import { reactionRegistry, type ReactionConfig } from "@/lib/effects/effectRegistry";
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
        triggeredAt: payload.timestamp
      });

      const loggedAt = Date.now();
      setHistory((prev) => {
        const next: HistoryItem = {
          id: `${eventName}-${loggedAt}-${Math.random().toString(16).slice(2)}`,
          label: config.label,
          emoji: config.emoji,
          color: config.color,
          timestamp: loggedAt
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
    []
  );

  useEffect(() => {
    const stopEmitter = startGestureEmitter();
    const handlers = new Map<ReactionEventName, (payload: ReactionEventPayload) => void>();

    for (const eventName of EVENT_NAMES) {
      const handler = (payload: ReactionEventPayload) => handleEvent(eventName, payload);
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
    <aside className="flex h-full w-full flex-col gap-4 rounded-lg border border-cyan-300/20 bg-slate-950/60 p-4 shadow-2xl shadow-black/40 backdrop-blur">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-cyan-200/70">
            Reaction Panel
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">Live reactions</h2>
        </div>
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            active ? "bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" : "bg-cyan-200/40"
          }`}
        />
      </header>

      <div className="flex min-h-[220px] flex-1 items-center justify-center rounded-lg border border-cyan-200/10 bg-slate-950/40 p-4">
        <AnimatePresence mode="wait">
          {active ? (
            <motion.div
              key={`${active.eventName}-${active.triggeredAt}`}
              className="flex w-full flex-col items-center justify-center gap-4 rounded-xl border px-4 py-5 text-center"
              style={{ borderColor: active.config.color }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/70">
                Current gesture
              </div>
              <div className="flex items-center gap-2 text-lg font-semibold text-white">
                <span className="text-2xl">{active.config.emoji}</span>
                <span>{active.config.label}</span>
              </div>
              <div className="h-40 w-full">
                <img
                  src={active.config.gifUrl}
                  alt={active.config.label}
                  className="h-full w-full object-contain"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              className="flex w-full flex-col items-center justify-center gap-3 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="h-14 w-14 rounded-full border border-cyan-200/30"
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.96, 1.02, 0.96] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <p className="text-sm font-medium text-cyan-100/80">No reaction detected</p>
              <p className="text-xs text-cyan-200/50">
                Hold a gesture to trigger a reaction.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[0.7rem] uppercase tracking-[0.3em] text-cyan-200/60">
          <span>History</span>
          <span className="text-cyan-200/40">last {HISTORY_LIMIT}</span>
        </div>
        <div className="max-h-28 overflow-auto pr-1">
          {history.length ? (
            <ul className="space-y-2">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-cyan-200/10 bg-slate-900/50 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2 text-cyan-50">
                    <span className="text-base">{item.emoji}</span>
                    <span className="font-medium" style={{ color: item.color }}>
                      {item.label}
                    </span>
                  </div>
                  <span className="text-[0.65rem] text-cyan-200/50">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-cyan-200/40">No gestures yet.</p>
          )}
        </div>
      </section>
    </aside>
  );
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

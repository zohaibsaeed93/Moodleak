"use client";

import { useRef, useState } from "react";
import { CanvasOverlay } from "@/components/CanvasOverlay";
import { ReactionPanel } from "@/components/ReactionPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { Webcam } from "@/components/Webcam";
import { useTrackingStore } from "@/store/trackingStore";
import { useFPS } from "@/lib/utils/fps";
import { Settings2 } from "lucide-react";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fps = useFPS();
  const initialized = useTrackingStore((state) => state.initialized);
  const webcamReady = useTrackingStore((state) => state.webcamReady);
  const faceCount = useTrackingStore(
    (state) => state.face?.faceLandmarks.length ?? 0,
  );
  const handCount = useTrackingStore(
    (state) => state.hands?.landmarks.length ?? 0,
  );
  const poseActive = useTrackingStore(
    (state) => (state.pose?.landmarks.length ?? 0) > 0,
  );
  const trackingActive = initialized && webcamReady;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-[400ms]">
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,var(--accent-dim),transparent_62%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.05))]" />
      </div>

      <section className="relative mx-auto flex min-h-dvh w-full max-w-[90rem] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-3 border-b border-[var(--border)] py-3 lg:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg font-semibold lowercase tracking-normal text-[var(--text-primary)]">
              moodleak
            </span>
            <span
              className={`h-2 w-2 rounded-full ${
                trackingActive ? "animate-pulse" : ""
              }`}
              style={{
                background: trackingActive
                  ? "var(--accent)"
                  : "var(--text-muted)",
                boxShadow: trackingActive ? "0 0 18px var(--accent)" : "none",
              }}
            />
          </div>

          <div className="order-3 col-span-2 flex flex-wrap justify-center gap-2 lg:order-none lg:col-span-1">
            <StatPill label="FPS" value={initialized ? fps.toString() : "--"} />
            <StatPill label="FACES" value={faceCount.toString()} />
            <StatPill label="HANDS" value={handCount.toString()} />
            <StatPill label="POSE" value={poseActive ? "ON" : "OFF"} />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              aria-label="Open settings"
              className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 size={18} strokeWidth={1.75} />
            </button>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
          <div
            className="theme-surface relative overflow-hidden rounded-2xl border bg-black shadow-2xl"
            style={{
              boxShadow: trackingActive
                ? "0 0 54px var(--accent-dim), 0 24px 80px rgba(0,0,0,0.18)"
                : "0 24px 80px rgba(0,0,0,0.16)",
            }}
          >
            <div className="relative">
              <Webcam videoRef={videoRef} />
              <CanvasOverlay videoRef={videoRef} />
              <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-base)_72%,transparent)] px-2.5 py-1 font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-[var(--accent-text)] backdrop-blur-md">
                <span className="mr-1.5 text-[var(--accent)]">●</span>
                Live
              </div>
            </div>
          </div>
          <ReactionPanel />
        </div>
      </section>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-8 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-[var(--text-muted)] backdrop-blur">
      <span>{label}</span>
      <span className="text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

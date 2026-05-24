"use client";

import { useRef } from "react";
import { CanvasOverlay } from "@/components/CanvasOverlay";
import { ReactionPanel } from "@/components/ReactionPanel";
import { TrackingDebugPanel } from "@/components/TrackingDebugPanel";
import { Webcam } from "@/components/Webcam";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  return (
    <main className="min-h-dvh bg-[#020407] text-cyan-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,220,255,0.18),transparent_36%),linear-gradient(180deg,rgba(10,22,30,0.52),transparent_28%,rgba(0,0,0,0.5))]" />
      <section className="relative mx-auto flex min-h-dvh w-full max-w-7xl flex-col items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex w-full max-w-5xl items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300/70">
              Phase 1 tracker
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-white sm:text-3xl">
              Realtime Vision Foundation
            </h1>
          </div>
          <div className="hidden border border-cyan-300/20 bg-cyan-300/5 px-3 py-2 text-xs text-cyan-100/70 sm:block">
            Client-side MediaPipe Tasks Vision
          </div>
        </div>

        <div className="grid w-full max-w-5xl grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative w-full overflow-hidden rounded-lg border border-cyan-300/20 bg-black shadow-2xl shadow-cyan-950/50">
            <Webcam videoRef={videoRef} />
            <CanvasOverlay videoRef={videoRef} />
            <TrackingDebugPanel videoRef={videoRef} />
          </div>
          <ReactionPanel />
        </div>
      </section>
    </main>
  );
}

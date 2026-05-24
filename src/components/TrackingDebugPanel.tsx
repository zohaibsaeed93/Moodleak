"use client";

import { RefObject, useEffect } from "react";
import { formatResolution } from "@/lib/utils/format";
import { useTrackingStore } from "@/store/trackingStore";
import { useFPS } from "@/lib/utils/fps";

type TrackingDebugPanelProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
};

export function TrackingDebugPanel({ videoRef }: TrackingDebugPanelProps) {
  const fps = useFPS();
  const initialized = useTrackingStore((state) => state.initialized);
  const webcamReady = useTrackingStore((state) => state.webcamReady);
  const videoSize = useTrackingStore((state) => state.videoSize);
  const faceCount = useTrackingStore(
    (state) => state.face?.faceLandmarks.length ?? 0,
  );
  const handCount = useTrackingStore(
    (state) => state.hands?.landmarks.length ?? 0,
  );
  const poseActive = useTrackingStore(
    (state) => (state.pose?.landmarks.length ?? 0) > 0,
  );
  const setVideoSize = useTrackingStore((state) => state.setVideoSize);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const updateSize = () => {
      setVideoSize({
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };

    updateSize();
    video.addEventListener("resize", updateSize);

    return () => video.removeEventListener("resize", updateSize);
  }, [setVideoSize, videoRef]);

  return (
    <aside className="absolute right-3 top-3 w-[min(18rem,calc(100%-1.5rem))] border border-cyan-300/20 bg-slate-950/55 p-3 text-xs text-cyan-50 shadow-2xl shadow-black/40 backdrop-blur-md sm:right-4 sm:top-4">
      <div className="mb-3 flex items-center justify-between border-b border-cyan-300/10 pb-2">
        <span className="font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
          Vision
        </span>
        <span
          className={`h-2 w-2 rounded-full ${
            initialized
              ? "bg-emerald-300 shadow-[0_0_12px_#6ee7b7]"
              : "bg-amber-300"
          }`}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <Metric label="FPS" value={initialized ? fps.toString() : "--"} />
        <Metric label="Camera" value={webcamReady ? "ready" : "waiting"} />
        <Metric label="Faces" value={faceCount.toString()} />
        <Metric label="Hands" value={handCount.toString()} />
        <Metric label="Pose" value={poseActive ? "active" : "inactive"} />
        <Metric
          label="Resolution"
          value={formatResolution(videoSize.width, videoSize.height)}
        />
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[0.65rem] uppercase tracking-[0.18em] text-cyan-200/45">
        {label}
      </dt>
      <dd className="mt-0.5 truncate font-mono text-[0.78rem] text-cyan-50/90">
        {value}
      </dd>
    </div>
  );
}

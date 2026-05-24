"use client";

import { RefObject, useEffect, useRef } from "react";
import { loadFaceLandmarker, smoothFaceResult } from "@/lib/mediapipe/face";
import { loadHandLandmarker, smoothHandResult } from "@/lib/mediapipe/hands";
import { loadPoseLandmarker, smoothPoseResult } from "@/lib/mediapipe/pose";
import { clearCanvas, drawTrackingResults } from "@/lib/drawing/drawLandmarks";
import { recordFrame } from "@/lib/utils/fps";
import { useTrackingStore } from "@/store/trackingStore";

type CanvasOverlayProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
};

export function CanvasOverlay({ videoRef }: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const webcamReady = useTrackingStore((state) => state.webcamReady);

  useEffect(() => {
    if (!webcamReady) {
      return;
    }

    let cancelled = false;
    const store = useTrackingStore.getState();
    store.setInitialized(false);

    async function initializeAndRun() {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (!canvas || !video) {
        return;
      }

      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) {
        return;
      }

      try {
        const [faceLandmarker, handLandmarker, poseLandmarker] =
          await Promise.all([
            loadFaceLandmarker(),
            loadHandLandmarker(),
            loadPoseLandmarker(),
          ]);

        if (cancelled) {
          return;
        }

        useTrackingStore.getState().setInitialized(true);
        const resizeCanvas = () => {
          const width = video.videoWidth;
          const height = video.videoHeight;

          if (!width || !height) {
            return;
          }

          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }
        };

        const tick = (time: DOMHighResTimeStamp) => {
          if (cancelled) {
            return;
          }

          resizeCanvas();

          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const videoTime = video.currentTime;
            const now = performance.now();

            if (videoTime !== lastVideoTimeRef.current) {
              lastVideoTimeRef.current = videoTime;

              const face = faceLandmarker.detectForVideo(video, now);
              const hands = handLandmarker.detectForVideo(video, now);
              const pose = poseLandmarker.detectForVideo(video, now);
              const results = {
                face: smoothFaceResult(face),
                hands: smoothHandResult(hands),
                pose: smoothPoseResult(pose),
                timestamp: now,
              };

              useTrackingStore.getState().setTrackingResults(results);
              drawTrackingResults(ctx, canvas, results, { mirrored: true });
              recordFrame(now);
            }
          } else {
            clearCanvas(ctx, canvas);
          }

          requestRef.current = requestAnimationFrame(tick);
        };

        requestRef.current = requestAnimationFrame(tick);
      } catch (error) {
        console.error("MediaPipe initialization failed", error);
        useTrackingStore.getState().setInitialized(false);
      }
    }

    initializeAndRun();

    return () => {
      cancelled = true;
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
      requestRef.current = null;
      useTrackingStore.getState().setInitialized(false);
    };
  }, [videoRef, webcamReady]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}

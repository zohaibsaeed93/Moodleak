"use client";

import { RefObject, useEffect, useState } from "react";
import { useTrackingStore } from "@/store/trackingStore";

type WebcamProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
};

export function Webcam({ videoRef }: WebcamProps) {
  const [error, setError] = useState<string | null>(null);
  const setWebcamReady = useTrackingStore((state) => state.setWebcamReady);
  const setVideoSize = useTrackingStore((state) => state.setVideoSize);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let mounted = true;

    const videoElement = videoRef.current;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera access is not available in this browser.");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 60, max: 60 },
            facingMode: "user"
          }
        });

        if (!mounted || !videoElement) {
          return;
        }

        videoElement.srcObject = stream;
        await videoElement.play();
      } catch (cameraError) {
        const message =
          cameraError instanceof Error
            ? cameraError.message
            : "Unable to start webcam.";
        setError(message);
        setWebcamReady(false);
      }
    }

    startCamera();

    return () => {
      mounted = false;
      setWebcamReady(false);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [setVideoSize, setWebcamReady, videoRef]);

  return (
    <div className="relative aspect-video w-full bg-black">
      <video
        ref={videoRef}
        className="h-full w-full scale-x-[-1] object-cover"
        muted
        playsInline
        autoPlay
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          setVideoSize({
            width: video.videoWidth,
            height: video.videoHeight
          });
          setWebcamReady(true);
        }}
      />

      {error ? (
        <div className="absolute inset-0 grid place-items-center bg-black/90 p-6 text-center">
          <div className="max-w-md border border-red-400/30 bg-red-500/10 p-5">
            <p className="text-sm font-semibold text-red-100">Webcam unavailable</p>
            <p className="mt-2 text-sm leading-6 text-red-100/70">{error}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { create } from "zustand";
import type { TrackingResults, VideoSize } from "@/types/tracking";

type TrackingState = {
  face: TrackingResults["face"];
  hands: TrackingResults["hands"];
  pose: TrackingResults["pose"];
  fps: number;
  initialized: boolean;
  webcamReady: boolean;
  videoSize: VideoSize;
  setInitialized: (initialized: boolean) => void;
  setWebcamReady: (webcamReady: boolean) => void;
  setVideoSize: (videoSize: VideoSize) => void;
  setFps: (fps: number) => void;
  setTrackingResults: (results: TrackingResults) => void;
  resetTracking: () => void;
};

export const useTrackingStore = create<TrackingState>((set) => ({
  face: null,
  hands: null,
  pose: null,
  fps: 0,
  initialized: false,
  webcamReady: false,
  videoSize: { width: 0, height: 0 },
  setInitialized: (initialized) => set({ initialized }),
  setWebcamReady: (webcamReady) => set({ webcamReady }),
  setVideoSize: (videoSize) => set({ videoSize }),
  setFps: (fps) => set({ fps }),
  setTrackingResults: ({ face, hands, pose }) => set({ face, hands, pose }),
  resetTracking: () =>
    set({
      face: null,
      hands: null,
      pose: null,
      fps: 0,
      initialized: false,
      webcamReady: false,
      videoSize: { width: 0, height: 0 }
    })
}));

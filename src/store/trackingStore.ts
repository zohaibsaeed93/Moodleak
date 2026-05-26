import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { TrackingResults, VideoSize } from "@/types/tracking";

const liveTracking: TrackingResults = {
  face: null,
  hands: null,
  pose: null,
  timestamp: 0,
};

export function getLiveTracking() {
  return liveTracking;
}

type TrackingState = {
  face: TrackingResults["face"];
  hands: TrackingResults["hands"];
  pose: TrackingResults["pose"];
  fps: number;
  initialized: boolean;
  webcamReady: boolean;
  videoSize: VideoSize;
  faceCount: number;
  handCount: number;
  poseActive: boolean;
  setInitialized: (initialized: boolean) => void;
  setWebcamReady: (webcamReady: boolean) => void;
  setVideoSize: (videoSize: VideoSize) => void;
  setFps: (fps: number) => void;
  setTrackingResults: (results: TrackingResults) => void;
  setTrackingStats: (stats: {
    faceCount: number;
    handCount: number;
    poseActive: boolean;
  }) => void;
  resetTracking: () => void;
};

export const useTrackingStore = create<TrackingState>()(
  subscribeWithSelector((set) => {
    const state = {
      face: null,
      hands: null,
      pose: null,
      fps: 0,
      initialized: false,
      webcamReady: false,
      videoSize: { width: 0, height: 0 },
      faceCount: 0,
      handCount: 0,
      poseActive: false,
      setInitialized: (initialized) => set({ initialized }),
      setWebcamReady: (webcamReady) => set({ webcamReady }),
      setVideoSize: (videoSize) => set({ videoSize }),
      setFps: (fps) => set({ fps }),
      setTrackingResults: ({ face, hands, pose, timestamp }) => {
        liveTracking.face = face;
        liveTracking.hands = hands;
        liveTracking.pose = pose;
        liveTracking.timestamp = timestamp;
      },
      setTrackingStats: ({ faceCount, handCount, poseActive }) =>
        set({ faceCount, handCount, poseActive }),
      resetTracking: () => {
        liveTracking.face = null;
        liveTracking.hands = null;
        liveTracking.pose = null;
        liveTracking.timestamp = 0;
        set({
          fps: 0,
          initialized: false,
          webcamReady: false,
          videoSize: { width: 0, height: 0 },
          faceCount: 0,
          handCount: 0,
          poseActive: false,
        });
      },
    } satisfies TrackingState;

    Object.defineProperties(state, {
      face: { get: () => liveTracking.face },
      hands: { get: () => liveTracking.hands },
      pose: { get: () => liveTracking.pose },
    });

    return state;
  }),
);

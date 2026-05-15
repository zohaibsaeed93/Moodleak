import type {
  FaceLandmarkerResult,
  HandLandmarkerResult,
  NormalizedLandmark,
  PoseLandmarkerResult
} from "@mediapipe/tasks-vision";

export type VideoSize = {
  width: number;
  height: number;
};

export type TrackingResults = {
  face: FaceLandmarkerResult | null;
  hands: HandLandmarkerResult | null;
  pose: PoseLandmarkerResult | null;
  timestamp: number;
};

export type LandmarkList = NormalizedLandmark[];

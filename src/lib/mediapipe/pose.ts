import { PoseLandmarker } from "@mediapipe/tasks-vision";
import type {
  PoseLandmarkerResult,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { loadVisionFileset } from "@/lib/mediapipe/loaders";
import { createSmoother } from "@/lib/tracking/smoother";

const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

let poseLandmarkerPromise: Promise<PoseLandmarker> | null = null;
const poseSmoother = createSmoother();

export async function loadPoseLandmarker() {
  poseLandmarkerPromise ??= loadVisionFileset().then((vision) =>
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: POSE_MODEL_URL,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    }),
  );

  return poseLandmarkerPromise;
}

export function smoothPoseResult(result: PoseLandmarkerResult | null) {
  if (!result?.landmarks?.length) {
    return result;
  }

  const smoothed = result.landmarks
    .map((landmarks) => poseSmoother.smooth(landmarks))
    .filter((l): l is NormalizedLandmark[] => l !== null);

  // preserve original result (may be class instance) and replace landmarks in-place
  // to avoid losing prototype methods like `close` when spreading.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (result as any).landmarks = smoothed;
  return result;
}

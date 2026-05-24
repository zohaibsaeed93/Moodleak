import { HandLandmarker } from "@mediapipe/tasks-vision";
import type {
  HandLandmarkerResult,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { loadVisionFileset } from "@/lib/mediapipe/loaders";
import { createSmoother } from "@/lib/tracking/smoother";

const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";

let handLandmarkerPromise: Promise<HandLandmarker> | null = null;
const handSmoothers: Array<ReturnType<typeof createSmoother>> = [];

export async function loadHandLandmarker() {
  handLandmarkerPromise ??= loadVisionFileset().then((vision) =>
    HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: HAND_MODEL_URL,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }),
  );

  return handLandmarkerPromise;
}

export function smoothHandResult(result: HandLandmarkerResult | null) {
  if (!result?.landmarks?.length) {
    return result;
  }

  const smoothed = result.landmarks
    .map((landmarks, index) => {
      if (!handSmoothers[index]) {
        handSmoothers[index] = createSmoother();
      }
      return handSmoothers[index].smooth(landmarks);
    })
    .filter((l): l is NormalizedLandmark[] => l !== null);

  return {
    ...result,
    landmarks: smoothed,
  };
}

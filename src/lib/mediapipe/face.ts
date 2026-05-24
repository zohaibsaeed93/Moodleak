import { FaceLandmarker } from "@mediapipe/tasks-vision";
import type {
  FaceLandmarkerResult,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { loadVisionFileset } from "@/lib/mediapipe/loaders";
import { createSmoother } from "@/lib/tracking/smoother";

const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

let faceLandmarkerPromise: Promise<FaceLandmarker> | null = null;
const faceSmoother = createSmoother();

export async function loadFaceLandmarker() {
  faceLandmarkerPromise ??= loadVisionFileset().then((vision) =>
    FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: FACE_MODEL_URL,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    }),
  );

  return faceLandmarkerPromise;
}

export function smoothFaceResult(result: FaceLandmarkerResult | null) {
  if (!result?.faceLandmarks?.length) {
    return result;
  }

  const smoothed = result.faceLandmarks
    .map((landmarks) => faceSmoother.smooth(landmarks))
    .filter((l): l is NormalizedLandmark[] => l !== null);

  return {
    ...result,
    faceLandmarks: smoothed,
  };
}

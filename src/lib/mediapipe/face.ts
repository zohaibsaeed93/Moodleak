import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { loadVisionFileset } from "@/lib/mediapipe/loaders";

const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

let faceLandmarkerPromise: Promise<FaceLandmarker> | null = null;

export async function loadFaceLandmarker() {
  faceLandmarkerPromise ??= loadVisionFileset().then((vision) =>
    FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: FACE_MODEL_URL,
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false
    })
  );

  return faceLandmarkerPromise;
}

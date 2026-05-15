import { PoseLandmarker } from "@mediapipe/tasks-vision";
import { loadVisionFileset } from "@/lib/mediapipe/loaders";

const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

let poseLandmarkerPromise: Promise<PoseLandmarker> | null = null;

export async function loadPoseLandmarker() {
  poseLandmarkerPromise ??= loadVisionFileset().then((vision) =>
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: POSE_MODEL_URL,
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false
    })
  );

  return poseLandmarkerPromise;
}

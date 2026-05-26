import { ImageSegmenter } from "@mediapipe/tasks-vision";
import { loadVisionFileset } from "@/lib/mediapipe/loaders";

const SEGMENTATION_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

let imageSegmenterPromise: Promise<ImageSegmenter> | null = null;

export function initSegmenter() {
  imageSegmenterPromise ??= loadVisionFileset().then((vision) =>
    ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: SEGMENTATION_MODEL_URL,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    }),
  );

  return imageSegmenterPromise;
}

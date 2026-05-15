import { FilesetResolver } from "@mediapipe/tasks-vision";

const WASM_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

let visionFilesetPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | null =
  null;

export function loadVisionFileset() {
  visionFilesetPromise ??= FilesetResolver.forVisionTasks(WASM_BASE_URL);
  return visionFilesetPromise;
}

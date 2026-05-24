import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

type LandmarkSmoother = {
  smooth: (
    landmarks: NormalizedLandmark[] | null,
  ) => NormalizedLandmark[] | null;
  reset: () => void;
};

export function createSmoother(alpha = 0.35): LandmarkSmoother {
  let previous: NormalizedLandmark[] | null = null;

  const smooth = (landmarks: NormalizedLandmark[] | null) => {
    if (!landmarks?.length) {
      previous = null;
      return landmarks;
    }

    if (!previous || previous.length !== landmarks.length) {
      const cloned = cloneLandmarks(landmarks);
      previous = cloned;
      return cloned;
    }

    const smoothed = landmarks.map((landmark, index) => {
      const prev = previous![index];
      if (!prev) {
        return { ...landmark };
      }
      return {
        ...landmark,
        x: blend(landmark.x, prev.x, alpha),
        y: blend(landmark.y, prev.y, alpha),
        z: blend(landmark.z ?? 0, prev.z ?? 0, alpha),
      };
    });

    previous = smoothed;
    return smoothed;
  };

  return {
    smooth,
    reset: () => {
      previous = null;
    },
  };
}

function blend(raw: number, previous: number, alpha: number) {
  return alpha * raw + (1 - alpha) * previous;
}

function cloneLandmarks(landmarks: NormalizedLandmark[]) {
  return landmarks.map((landmark) => ({ ...landmark }));
}

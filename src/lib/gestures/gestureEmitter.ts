import type {
  HandLandmarkerResult,
  NormalizedLandmark,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { eventBus, type ReactionEventName } from "@/lib/events/eventBus";
import { GestureStabilizer } from "@/lib/tracking/stabilizer";
import { useTrackingStore } from "@/store/trackingStore";

const COOLDOWN_MS = 1200;
const FACE_REQUIRED_FRAMES = 4;
const HAND_REQUIRED_FRAMES = 2;
const POSE_REQUIRED_FRAMES = 4;
const HOLD_RELEASE_FRAMES = 3;
const GLOBAL_WINDOW_MS = 500;
const GLOBAL_MAX_GESTURES = 2;

const FACE_CONFIDENCE_THRESHOLD = 0.82;
const GESTURE_CONFIDENCE_THRESHOLD = 0.75;
const POSE_VISIBILITY_THRESHOLD = 0.5;

type GestureContext = {
  hands: HandLandmarkerResult | null;
  pose: PoseLandmarkerResult | null;
  faceLandmarks: NormalizedLandmark[] | null;
};

type GestureType = "face" | "hand" | "pose";

type GestureScore = {
  confidence: number;
  visibility?: number;
};

type GestureEvaluator = {
  name: ReactionEventName;
  type: GestureType;
  evaluate: (context: GestureContext) => GestureScore;
};

const FACE_LANDMARKS = {
  leftMouth: 61,
  rightMouth: 291,
  upperLip: 13,
  lowerLip: 14,
};

const POSE_LANDMARKS = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftWrist: 15,
  rightWrist: 16,
};

const HAND_LANDMARKS = {
  wrist: 0,
  thumbTip: 4,
  thumbMcp: 2,
  indexMcp: 5,
  indexPip: 6,
  indexTip: 8,
  middleMcp: 9,
  middlePip: 10,
  middleTip: 12,
  ringMcp: 13,
  ringPip: 14,
  ringTip: 16,
  pinkyMcp: 17,
  pinkyPip: 18,
  pinkyTip: 20,
};

const GESTURE_EVALUATORS: GestureEvaluator[] = [
  {
    name: "SMILE_DETECTED",
    type: "face",
    evaluate: ({ faceLandmarks }) => ({
      confidence: getSmileConfidence(faceLandmarks),
    }),
  },
  {
    name: "SAD_DETECTED",
    type: "face",
    evaluate: ({ faceLandmarks }) => ({
      confidence: getSadConfidence(faceLandmarks),
    }),
  },
  {
    name: "SURPRISED_DETECTED",
    type: "face",
    evaluate: ({ faceLandmarks }) => ({
      confidence: getSurprisedConfidence(faceLandmarks),
    }),
  },
  {
    name: "ARMS_RAISED_DETECTED",
    type: "pose",
    evaluate: ({ pose }) => getArmsRaisedScore(pose),
  },
  {
    name: "PEACE_SIGN_DETECTED",
    type: "hand",
    evaluate: ({ hands }) => getPeaceSignScore(hands),
  },
  {
    name: "THUMBS_UP_DETECTED",
    type: "hand",
    evaluate: ({ hands }) => getThumbsUpScore(hands),
  },
];

export function startGestureEmitter() {
  const lastEmitted: Partial<Record<ReactionEventName, number>> = {};
  const inactiveFrames: Partial<Record<ReactionEventName, number>> = {};
  const consecutiveDetectedFrames: Partial<Record<ReactionEventName, number>> =
    {};
  const activeGestures = new Set<ReactionEventName>();
  const stabilizers = new Map<ReactionEventName, GestureStabilizer>();
  const recentEmits: Array<{ name: ReactionEventName; time: number }> = [];
  let active = true;
  let rafId: number | null = null;

  const getStabilizer = (name: ReactionEventName, type: GestureType) => {
    const existing = stabilizers.get(name);
    if (existing) {
      return existing;
    }

    const stabilizer = new GestureStabilizer({
      requiredFrames: getRequiredFramesByType(type),
      cooldownMs: COOLDOWN_MS,
    });
    stabilizers.set(name, stabilizer);
    return stabilizer;
  };

  const canEmitGlobal = (name: ReactionEventName, now: number) => {
    const windowStart = now - GLOBAL_WINDOW_MS;
    while (recentEmits.length && recentEmits[0].time < windowStart) {
      recentEmits.shift();
    }

    const uniqueGestures = new Set(recentEmits.map((entry) => entry.name));
    if (
      !uniqueGestures.has(name) &&
      uniqueGestures.size >= GLOBAL_MAX_GESTURES
    ) {
      return false;
    }

    recentEmits.push({ name, time: now });
    return true;
  };

  const tick = () => {
    if (!active) {
      return;
    }

    const { face, hands, pose } = useTrackingStore.getState();
    const faceLandmarks = face?.faceLandmarks?.[0] ?? null;

    const now = performance.now();

    for (const evaluator of GESTURE_EVALUATORS) {
      const score = evaluator.evaluate({ hands, pose, faceLandmarks });
      const isDetected = meetsThreshold(evaluator, score);

      if (isDetected && evaluator.type === "hand") {
        const consecutiveCount =
          (consecutiveDetectedFrames[evaluator.name] ?? 0) + 1;
        consecutiveDetectedFrames[evaluator.name] = consecutiveCount;
      } else if (!isDetected) {
        consecutiveDetectedFrames[evaluator.name] = 0;
      }

      if (isDetected) {
        inactiveFrames[evaluator.name] = 0;
      } else {
        const missedFrames = (inactiveFrames[evaluator.name] ?? 0) + 1;
        inactiveFrames[evaluator.name] = missedFrames;
        if (missedFrames >= HOLD_RELEASE_FRAMES) {
          activeGestures.delete(evaluator.name);
        }
      }

      const stabilizer = getStabilizer(evaluator.name, evaluator.type);
      const { emit } = stabilizer.update(isDetected, now);
      if (!emit) {
        continue;
      }

      if (activeGestures.has(evaluator.name)) {
        continue;
      }

      const lastTime = lastEmitted[evaluator.name] ?? 0;
      if (now - lastTime < COOLDOWN_MS) {
        continue;
      }

      if (!canEmitGlobal(evaluator.name, now)) {
        continue;
      }

      lastEmitted[evaluator.name] = now;
      activeGestures.add(evaluator.name);
      eventBus.emit(evaluator.name, {
        confidence: score.confidence,
        timestamp: now,
      });
    }

    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);

  return () => {
    active = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  };
}

function getSmileConfidence(faceLandmarks: NormalizedLandmark[] | null) {
  if (!faceLandmarks) {
    return 0;
  }

  const left = faceLandmarks[FACE_LANDMARKS.leftMouth];
  const right = faceLandmarks[FACE_LANDMARKS.rightMouth];
  const upper = faceLandmarks[FACE_LANDMARKS.upperLip];
  const lower = faceLandmarks[FACE_LANDMARKS.lowerLip];

  if (!left || !right || !upper || !lower) {
    return 0;
  }

  const width = distance2D(left, right);
  const height = distance2D(upper, lower);

  if (height <= 0) {
    return 0;
  }

  const ratio = width / height;
  return clamp((ratio - 2.4) / 1.4, 0, 1);
}

function getSadConfidence(faceLandmarks: NormalizedLandmark[] | null) {
  if (!faceLandmarks) {
    return 0;
  }

  const left = faceLandmarks[FACE_LANDMARKS.leftMouth];
  const right = faceLandmarks[FACE_LANDMARKS.rightMouth];
  const upper = faceLandmarks[FACE_LANDMARKS.upperLip];
  const lower = faceLandmarks[FACE_LANDMARKS.lowerLip];

  if (!left || !right || !upper || !lower) {
    return 0;
  }

  const width = distance2D(left, right);
  const height = distance2D(upper, lower);
  const mouthCenterY = (upper.y + lower.y) / 2;
  const cornerY = (left.y + right.y) / 2;
  const cornerDrop = cornerY - mouthCenterY;

  const dropScore = clamp((cornerDrop - 0.012) / 0.03, 0, 1);
  const widthScore = clamp((2.1 - width / Math.max(height, 0.001)) / 0.9, 0, 1);

  return clamp(dropScore * widthScore, 0, 1);
}

function getSurprisedConfidence(faceLandmarks: NormalizedLandmark[] | null) {
  if (!faceLandmarks) {
    return 0;
  }

  const left = faceLandmarks[FACE_LANDMARKS.leftMouth];
  const right = faceLandmarks[FACE_LANDMARKS.rightMouth];
  const upper = faceLandmarks[FACE_LANDMARKS.upperLip];
  const lower = faceLandmarks[FACE_LANDMARKS.lowerLip];

  if (!left || !right || !upper || !lower) {
    return 0;
  }

  const width = distance2D(left, right);
  const height = distance2D(upper, lower);

  if (width <= 0) {
    return 0;
  }

  const openRatio = height / width;
  return clamp((openRatio - 0.28) / 0.2, 0, 1);
}

function getArmsRaisedConfidence(pose: PoseLandmarkerResult | null) {
  if (!pose?.landmarks?.length) {
    return 0;
  }

  const landmarks = pose.landmarks[0];
  const leftShoulder = landmarks[POSE_LANDMARKS.leftShoulder];
  const rightShoulder = landmarks[POSE_LANDMARKS.rightShoulder];
  const leftWrist = landmarks[POSE_LANDMARKS.leftWrist];
  const rightWrist = landmarks[POSE_LANDMARKS.rightWrist];

  if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist) {
    return 0;
  }

  if (
    !isVisible(leftShoulder, POSE_VISIBILITY_THRESHOLD) ||
    !isVisible(rightShoulder, POSE_VISIBILITY_THRESHOLD) ||
    !isVisible(leftWrist, POSE_VISIBILITY_THRESHOLD) ||
    !isVisible(rightWrist, POSE_VISIBILITY_THRESHOLD)
  ) {
    return 0;
  }

  if (
    leftWrist.y >= leftShoulder.y ||
    leftWrist.y >= rightShoulder.y ||
    rightWrist.y >= leftShoulder.y ||
    rightWrist.y >= rightShoulder.y
  ) {
    return 0;
  }

  return 1;
}

function getArmsRaisedScore(pose: PoseLandmarkerResult | null): GestureScore {
  const confidence = getArmsRaisedConfidence(pose);
  if (!pose?.landmarks?.length) {
    return { confidence, visibility: 0 };
  }

  const landmarks = pose.landmarks[0];
  const visibility = averageVisibility([
    landmarks[POSE_LANDMARKS.leftShoulder],
    landmarks[POSE_LANDMARKS.rightShoulder],
    landmarks[POSE_LANDMARKS.leftWrist],
    landmarks[POSE_LANDMARKS.rightWrist],
  ]);
  return { confidence, visibility };
}

function getPeaceSignScore(hands: HandLandmarkerResult | null): GestureScore {
  if (!hands?.landmarks?.length) {
    return { confidence: 0 };
  }

  let best = 0;
  let bestVisibility = 0;
  for (const hand of hands.landmarks) {
    const confidence = evaluatePeaceSign(hand) ? 1 : 0;
    const visibility = averageVisibility(hand);
    if (confidence > best) {
      best = confidence;
      bestVisibility = visibility;
    }
  }

  return { confidence: best, visibility: bestVisibility };
}

function getThumbsUpScore(hands: HandLandmarkerResult | null): GestureScore {
  if (!hands?.landmarks?.length) {
    return { confidence: 0 };
  }

  let best = 0;
  let bestVisibility = 0;
  for (const hand of hands.landmarks) {
    const confidence = evaluateThumbsUp(hand) ? 1 : 0;
    const visibility = averageVisibility(hand);
    if (confidence > best) {
      best = confidence;
      bestVisibility = visibility;
    }
  }

  return { confidence: best, visibility: bestVisibility };
}

function averageVisibility(landmarks: NormalizedLandmark[]) {
  let sum = 0;
  let count = 0;
  for (const lm of landmarks) {
    if (lm && typeof lm.visibility === "number") {
      sum += lm.visibility;
      count += 1;
    }
  }
  return count ? sum / count : 0;
}

function evaluatePeaceSign(landmarks: NormalizedLandmark[]) {
  const indexExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARKS.indexTip,
    HAND_LANDMARKS.indexPip,
  );
  const middleExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARKS.middleTip,
    HAND_LANDMARKS.middlePip,
  );
  const ringCurled = isFingerCurled(
    landmarks,
    HAND_LANDMARKS.ringTip,
    HAND_LANDMARKS.ringPip,
  );
  const pinkyCurled = isFingerCurled(
    landmarks,
    HAND_LANDMARKS.pinkyTip,
    HAND_LANDMARKS.pinkyPip,
  );

  return indexExtended && middleExtended && ringCurled && pinkyCurled;
}

function evaluateThumbsUp(landmarks: NormalizedLandmark[]) {
  const thumbTip = landmarks[HAND_LANDMARKS.thumbTip];
  const thumbMcp = landmarks[HAND_LANDMARKS.thumbMcp];
  const wrist = landmarks[HAND_LANDMARKS.wrist];
  const indexCurled = isFingerCurled(
    landmarks,
    HAND_LANDMARKS.indexTip,
    HAND_LANDMARKS.indexPip,
  );
  const middleCurled = isFingerCurled(
    landmarks,
    HAND_LANDMARKS.middleTip,
    HAND_LANDMARKS.middlePip,
  );
  const ringCurled = isFingerCurled(
    landmarks,
    HAND_LANDMARKS.ringTip,
    HAND_LANDMARKS.ringPip,
  );
  const pinkyCurled = isFingerCurled(
    landmarks,
    HAND_LANDMARKS.pinkyTip,
    HAND_LANDMARKS.pinkyPip,
  );

  if (!thumbTip || !thumbMcp || !wrist) {
    return false;
  }

  const thumbExtended = thumbTip.y < thumbMcp.y;

  return (
    thumbExtended && indexCurled && middleCurled && ringCurled && pinkyCurled
  );
}

function evaluateOpenPalm(landmarks: NormalizedLandmark[]) {
  const wrist = landmarks[HAND_LANDMARKS.wrist];
  const thumbTip = landmarks[HAND_LANDMARKS.thumbTip];
  const thumbMcp = landmarks[HAND_LANDMARKS.thumbMcp];

  if (!wrist || !thumbTip || !thumbMcp) {
    return false;
  }

  return (
    isFingerExtended(
      landmarks,
      HAND_LANDMARKS.indexTip,
      HAND_LANDMARKS.indexPip,
    ) &&
    isFingerExtended(
      landmarks,
      HAND_LANDMARKS.middleTip,
      HAND_LANDMARKS.middlePip,
    ) &&
    isFingerExtended(
      landmarks,
      HAND_LANDMARKS.ringTip,
      HAND_LANDMARKS.ringPip,
    ) &&
    isFingerExtended(
      landmarks,
      HAND_LANDMARKS.pinkyTip,
      HAND_LANDMARKS.pinkyPip,
    ) &&
    Math.abs(thumbTip.x - wrist.x) > Math.abs(thumbMcp.x - wrist.x)
  );
}

function evaluateFist(landmarks: NormalizedLandmark[]) {
  return (
    isFingerCurled(
      landmarks,
      HAND_LANDMARKS.indexTip,
      HAND_LANDMARKS.indexPip,
    ) &&
    isFingerCurled(
      landmarks,
      HAND_LANDMARKS.middleTip,
      HAND_LANDMARKS.middlePip,
    ) &&
    isFingerCurled(landmarks, HAND_LANDMARKS.ringTip, HAND_LANDMARKS.ringPip) &&
    isFingerCurled(
      landmarks,
      HAND_LANDMARKS.pinkyTip,
      HAND_LANDMARKS.pinkyPip,
    ) &&
    isThumbCurled(landmarks)
  );
}

function meetsThreshold(evaluator: GestureEvaluator, score: GestureScore) {
  if (!score || typeof score.confidence !== "number") {
    return false;
  }

  if (evaluator.type === "face") {
    return score.confidence >= FACE_CONFIDENCE_THRESHOLD;
  }

  if (evaluator.type === "hand") {
    return score.confidence >= GESTURE_CONFIDENCE_THRESHOLD;
  }

  if (evaluator.type === "pose") {
    if ((score.visibility ?? 0) < POSE_VISIBILITY_THRESHOLD) {
      return false;
    }
    return score.confidence >= GESTURE_CONFIDENCE_THRESHOLD;
  }

  return score.confidence >= GESTURE_CONFIDENCE_THRESHOLD;
}

function getRequiredFramesByType(type: GestureType) {
  if (type === "hand") {
    return HAND_REQUIRED_FRAMES;
  }

  if (type === "pose") {
    return POSE_REQUIRED_FRAMES;
  }

  return FACE_REQUIRED_FRAMES;
}

function isFingerExtended(
  landmarks: NormalizedLandmark[],
  tipIndex: number,
  pipIndex: number,
) {
  const tip = landmarks[tipIndex];
  const pip = landmarks[pipIndex];

  if (!tip || !pip) {
    return false;
  }

  return tip.y < pip.y;
}

function isFingerCurled(
  landmarks: NormalizedLandmark[],
  tipIndex: number,
  pipIndex: number,
) {
  const tip = landmarks[tipIndex];
  const pip = landmarks[pipIndex];

  if (!tip || !pip) {
    return false;
  }

  return tip.y > pip.y;
}

function isThumbCurled(landmarks: NormalizedLandmark[]) {
  const wrist = landmarks[HAND_LANDMARKS.wrist];
  const thumbTip = landmarks[HAND_LANDMARKS.thumbTip];
  const thumbMcp = landmarks[HAND_LANDMARKS.thumbMcp];

  if (!wrist || !thumbTip || !thumbMcp) {
    return false;
  }

  return Math.abs(thumbTip.x - wrist.x) <= Math.abs(thumbMcp.x - wrist.x);
}

function isVisible(landmark: NormalizedLandmark, minVisibility = 0.5) {
  return (landmark.visibility ?? 1) >= minVisibility;
}

function distance2D(a: NormalizedLandmark, b: NormalizedLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

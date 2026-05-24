import type {
  HandLandmarkerResult,
  NormalizedLandmark,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { eventBus, type ReactionEventName } from "@/lib/events/eventBus";
import { useTrackingStore } from "@/store/trackingStore";

const COOLDOWN_MS = 800;
const CONFIDENCE_THRESHOLD = 0.75;
const RELEASE_THRESHOLD = 0.55;

type GestureContext = {
  hands: HandLandmarkerResult | null;
  pose: PoseLandmarkerResult | null;
  faceLandmarks: NormalizedLandmark[] | null;
};

type GestureEvaluator = {
  name: ReactionEventName;
  evaluate: (context: GestureContext) => number;
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
    evaluate: ({ faceLandmarks }) => getSmileConfidence(faceLandmarks),
  },
  {
    name: "SAD_DETECTED",
    evaluate: ({ faceLandmarks }) => getSadConfidence(faceLandmarks),
  },
  {
    name: "SURPRISED_DETECTED",
    evaluate: ({ faceLandmarks }) => getSurprisedConfidence(faceLandmarks),
  },
  {
    name: "ARMS_RAISED_DETECTED",
    evaluate: ({ pose }) => getArmsRaisedConfidence(pose),
  },
  {
    name: "PEACE_SIGN_DETECTED",
    evaluate: ({ hands }) => getPeaceSignConfidence(hands),
  },
  {
    name: "THUMBS_UP_DETECTED",
    evaluate: ({ hands }) => getThumbsUpConfidence(hands),
  },
];

export function startGestureEmitter() {
  const lastEmitted: Partial<Record<ReactionEventName, number>> = {};
  const activeStates: Partial<Record<ReactionEventName, boolean>> = {};
  let active = true;
  let rafId: number | null = null;

  const tick = () => {
    if (!active) {
      return;
    }

    const { face, hands, pose } = useTrackingStore.getState();
    const faceLandmarks = face?.faceLandmarks?.[0] ?? null;
    const now = performance.now();

    for (const evaluator of GESTURE_EVALUATORS) {
      const confidence = evaluator.evaluate({ hands, pose, faceLandmarks });
      const isActive = activeStates[evaluator.name] ?? false;

      if (confidence >= CONFIDENCE_THRESHOLD) {
        if (!isActive) {
          const lastTime = lastEmitted[evaluator.name] ?? 0;
          if (now - lastTime >= COOLDOWN_MS) {
            lastEmitted[evaluator.name] = now;
            eventBus.emit(evaluator.name, { confidence, timestamp: now });
          }
          activeStates[evaluator.name] = true;
        }
        continue;
      }

      if (confidence <= RELEASE_THRESHOLD) {
        activeStates[evaluator.name] = false;
      }
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

  if (!isVisible(leftShoulder) || !isVisible(rightShoulder)) {
    return 0;
  }

  const leftRaise = leftShoulder.y - leftWrist.y;
  const rightRaise = rightShoulder.y - rightWrist.y;

  if (leftRaise <= 0 || rightRaise <= 0) {
    return 0;
  }

  const minRaise = Math.min(leftRaise, rightRaise);
  return clamp((minRaise - 0.06) / 0.18, 0, 1);
}

function getPeaceSignConfidence(hands: HandLandmarkerResult | null) {
  if (!hands?.landmarks?.length) {
    return 0;
  }

  let best = 0;
  for (const hand of hands.landmarks) {
    const confidence = evaluatePeaceSign(hand);
    if (confidence > best) {
      best = confidence;
    }
  }

  return best;
}

function getThumbsUpConfidence(hands: HandLandmarkerResult | null) {
  if (!hands?.landmarks?.length) {
    return 0;
  }

  let best = 0;
  for (const hand of hands.landmarks) {
    const confidence = evaluateThumbsUp(hand);
    if (confidence > best) {
      best = confidence;
    }
  }

  return best;
}

function evaluatePeaceSign(landmarks: NormalizedLandmark[]) {
  const indexExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARKS.indexTip,
    HAND_LANDMARKS.indexPip,
    HAND_LANDMARKS.indexMcp,
  );
  const middleExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARKS.middleTip,
    HAND_LANDMARKS.middlePip,
    HAND_LANDMARKS.middleMcp,
  );
  const ringExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARKS.ringTip,
    HAND_LANDMARKS.ringPip,
    HAND_LANDMARKS.ringMcp,
  );
  const pinkyExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARKS.pinkyTip,
    HAND_LANDMARKS.pinkyPip,
    HAND_LANDMARKS.pinkyMcp,
  );

  if (!indexExtended || !middleExtended) {
    return 0;
  }

  const indexTip = landmarks[HAND_LANDMARKS.indexTip];
  const middleTip = landmarks[HAND_LANDMARKS.middleTip];
  const indexBase = landmarks[HAND_LANDMARKS.indexMcp];
  const middleBase = landmarks[HAND_LANDMARKS.middleMcp];

  if (!indexTip || !middleTip || !indexBase || !middleBase) {
    return 0;
  }

  const separation = distance2D(indexTip, middleTip);
  const base = distance2D(indexBase, middleBase);
  const spreadScore =
    base > 0 ? clamp((separation / base - 0.4) / 0.6, 0, 1) : 0.5;
  const foldPenalty = (ringExtended ? 0.35 : 0) + (pinkyExtended ? 0.35 : 0);

  return clamp(0.7 + 0.3 * spreadScore - foldPenalty, 0, 1);
}

function evaluateThumbsUp(landmarks: NormalizedLandmark[]) {
  const thumbTip = landmarks[HAND_LANDMARKS.thumbTip];
  const thumbMcp = landmarks[HAND_LANDMARKS.thumbMcp];
  const wrist = landmarks[HAND_LANDMARKS.wrist];

  if (!thumbTip || !thumbMcp || !wrist) {
    return 0;
  }

  const thumbDistance = distance2D(thumbTip, wrist);
  const thumbBaseDistance = distance2D(thumbMcp, wrist);
  const thumbExtended = thumbDistance > thumbBaseDistance * 1.3;

  if (!thumbExtended) {
    return 0;
  }

  const indexExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARKS.indexTip,
    HAND_LANDMARKS.indexPip,
    HAND_LANDMARKS.indexMcp,
  );
  const middleExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARKS.middleTip,
    HAND_LANDMARKS.middlePip,
    HAND_LANDMARKS.middleMcp,
  );
  const ringExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARKS.ringTip,
    HAND_LANDMARKS.ringPip,
    HAND_LANDMARKS.ringMcp,
  );
  const pinkyExtended = isFingerExtended(
    landmarks,
    HAND_LANDMARKS.pinkyTip,
    HAND_LANDMARKS.pinkyPip,
    HAND_LANDMARKS.pinkyMcp,
  );

  const extendedCount = [
    indexExtended,
    middleExtended,
    ringExtended,
    pinkyExtended,
  ].filter(Boolean).length;
  const penalty = extendedCount * 0.2;

  return clamp(0.9 - penalty, 0, 1);
}

function isFingerExtended(
  landmarks: NormalizedLandmark[],
  tipIndex: number,
  pipIndex: number,
  mcpIndex: number,
) {
  const tip = landmarks[tipIndex];
  const pip = landmarks[pipIndex];
  const mcp = landmarks[mcpIndex];

  if (!tip || !pip || !mcp) {
    return false;
  }

  return tip.y < pip.y && pip.y < mcp.y;
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

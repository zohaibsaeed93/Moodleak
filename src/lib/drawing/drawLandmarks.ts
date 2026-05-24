import type {
  FaceLandmarkerResult,
  HandLandmarkerResult,
  NormalizedLandmark,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

type DrawSize = {
  width: number;
  height: number;
};

type DrawOptions = {
  mirrored?: boolean;
};

type DrawPoint = {
  x: number;
  y: number;
};

const DRAW_SMOOTH_ALPHA = 0.35;
const DRAW_MIN_MOVE_PX = 1.5;
const drawCache = new Map<string, Map<number, DrawPoint>>();
let lastDrawSize: DrawSize | null = null;

const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
] as const;

const POSE_CONNECTIONS = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 29],
  [29, 31],
  [28, 30],
  [30, 32],
] as const;

export function clearCanvas(ctx: CanvasRenderingContext2D, size: DrawSize) {
  ctx.clearRect(0, 0, size.width, size.height);
}

export function drawTrackingResults(
  ctx: CanvasRenderingContext2D,
  size: DrawSize,
  results: {
    face: FaceLandmarkerResult | null;
    hands: HandLandmarkerResult | null;
    pose: PoseLandmarkerResult | null;
  },
  options: DrawOptions = {},
) {
  clearCanvas(ctx, size);
  ensureDrawCache(size);

  if (results.pose?.landmarks?.length) {
    results.pose.landmarks.forEach((landmarks, index) => {
      const points = getStablePoints(landmarks, size, options, `pose-${index}`);
      drawConnections(
        ctx,
        landmarks,
        POSE_CONNECTIONS,
        points,
        "#48f7c4",
        3,
        0.45,
      );
      drawPoints(ctx, landmarks, points, "#bfffee", 3.5, 0.65);
    });
  }

  if (results.face?.faceLandmarks?.length) {
    results.face.faceLandmarks.forEach((landmarks, index) => {
      const points = getStablePoints(landmarks, size, options, `face-${index}`);
      drawPoints(ctx, landmarks, points, "#5ed7ff", 1.45, 0.8);
    });
  }

  if (results.hands?.landmarks?.length) {
    results.hands.landmarks.forEach((landmarks, index) => {
      const points = getStablePoints(landmarks, size, options, `hand-${index}`);
      drawConnections(
        ctx,
        landmarks,
        HAND_CONNECTIONS,
        points,
        "#ff3ee2",
        2.5,
        0.45,
      );
      drawPoints(ctx, landmarks, points, "#ffd8fb", 4, 0.8);
    });
  }
}

function drawPoints(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  points: DrawPoint[],
  color: string,
  radius: number,
  minVisibility = 0,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  for (let index = 0; index < landmarks.length; index += 1) {
    const landmark = landmarks[index];
    if ((landmark.visibility ?? 1) < minVisibility) {
      continue;
    }

    const point = points[index];
    if (!point) {
      continue;
    }
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawConnections(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  connections: readonly (readonly [number, number])[],
  points: DrawPoint[],
  color: string,
  lineWidth: number,
  minVisibility = 0.45,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;

  for (const [startIndex, endIndex] of connections) {
    const start = landmarks[startIndex];
    const end = landmarks[endIndex];

    if (
      !start ||
      !end ||
      (start.visibility ?? 1) < minVisibility ||
      (end.visibility ?? 1) < minVisibility
    ) {
      continue;
    }

    const startPoint = points[startIndex];
    const endPoint = points[endIndex];
    if (!startPoint || !endPoint) {
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.stroke();
  }

  ctx.restore();
}

function projectLandmark(
  landmark: NormalizedLandmark,
  size: DrawSize,
  options: DrawOptions,
) {
  const x = options.mirrored ? 1 - landmark.x : landmark.x;

  return {
    x: x * size.width,
    y: landmark.y * size.height,
  };
}

function ensureDrawCache(size: DrawSize) {
  if (
    !lastDrawSize ||
    lastDrawSize.width !== size.width ||
    lastDrawSize.height !== size.height
  ) {
    drawCache.clear();
    lastDrawSize = { ...size };
  }
}

function getStablePoints(
  landmarks: NormalizedLandmark[],
  size: DrawSize,
  options: DrawOptions,
  cacheKey: string,
) {
  let cache = drawCache.get(cacheKey);
  if (!cache) {
    cache = new Map();
    drawCache.set(cacheKey, cache);
  }

  const points: DrawPoint[] = [];

  for (let index = 0; index < landmarks.length; index += 1) {
    const landmark = landmarks[index];
    if (!landmark) {
      continue;
    }

    const rawPoint = projectLandmark(landmark, size, options);
    const previous = cache.get(index);
    let nextPoint = rawPoint;

    if (previous) {
      const smoothed = {
        x: blend(rawPoint.x, previous.x, DRAW_SMOOTH_ALPHA),
        y: blend(rawPoint.y, previous.y, DRAW_SMOOTH_ALPHA),
      };
      const distance = Math.hypot(
        smoothed.x - previous.x,
        smoothed.y - previous.y,
      );
      nextPoint = distance < DRAW_MIN_MOVE_PX ? previous : smoothed;
    }

    cache.set(index, nextPoint);
    points[index] = nextPoint;
  }

  return points;
}

function blend(raw: number, previous: number, alpha: number) {
  return alpha * raw + (1 - alpha) * previous;
}

import type {
  FaceLandmarkerResult,
  HandLandmarkerResult,
  NormalizedLandmark,
  PoseLandmarkerResult
} from "@mediapipe/tasks-vision";

type DrawSize = {
  width: number;
  height: number;
};

type DrawOptions = {
  mirrored?: boolean;
};

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
  [0, 17]
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
  [30, 32]
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
  options: DrawOptions = {}
) {
  clearCanvas(ctx, size);

  if (results.pose?.landmarks?.length) {
    for (const landmarks of results.pose.landmarks) {
      drawConnections(ctx, landmarks, POSE_CONNECTIONS, size, "#48f7c4", 3, options);
      drawPoints(ctx, landmarks, size, "#bfffee", 3.5, options, 0.65);
    }
  }

  if (results.face?.faceLandmarks?.length) {
    for (const landmarks of results.face.faceLandmarks) {
      drawPoints(ctx, landmarks, size, "#5ed7ff", 1.45, options, 0.8);
    }
  }

  if (results.hands?.landmarks?.length) {
    for (const landmarks of results.hands.landmarks) {
      drawConnections(ctx, landmarks, HAND_CONNECTIONS, size, "#ff3ee2", 2.5, options);
      drawPoints(ctx, landmarks, size, "#ffd8fb", 4, options, 0.8);
    }
  }
}

function drawPoints(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  size: DrawSize,
  color: string,
  radius: number,
  options: DrawOptions,
  minVisibility = 0
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  for (const landmark of landmarks) {
    if ((landmark.visibility ?? 1) < minVisibility) {
      continue;
    }

    const { x, y } = projectLandmark(landmark, size, options);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawConnections(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  connections: readonly (readonly [number, number])[],
  size: DrawSize,
  color: string,
  lineWidth: number,
  options: DrawOptions
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

    if (!start || !end || (start.visibility ?? 1) < 0.45 || (end.visibility ?? 1) < 0.45) {
      continue;
    }

    const startPoint = projectLandmark(start, size, options);
    const endPoint = projectLandmark(end, size, options);
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
  options: DrawOptions
) {
  const x = options.mirrored ? 1 - landmark.x : landmark.x;

  return {
    x: x * size.width,
    y: landmark.y * size.height
  };
}

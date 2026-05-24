import { useEffect, useState } from "react";

const BUFFER_SIZE = 30;
const DISPLAY_INTERVAL_MS = 500;

const frameTimes: number[] = new Array(BUFFER_SIZE);
let frameCount = 0;
let writeIndex = 0;

let displayFps = 0;
let lastDisplayTime = 0;

const listeners = new Set<() => void>();

export function recordFrame(timestamp: number) {
  frameTimes[writeIndex] = timestamp;
  writeIndex = (writeIndex + 1) % BUFFER_SIZE;
  frameCount = Math.min(frameCount + 1, BUFFER_SIZE);

  const nextFps = computeFps();
  if (timestamp - lastDisplayTime >= DISPLAY_INTERVAL_MS) {
    displayFps = nextFps;
    lastDisplayTime = timestamp;
    for (const listener of listeners) {
      listener();
    }
  }
}

export function useFPS() {
  const [fps, setFps] = useState(displayFps);

  useEffect(() => {
    const handleUpdate = () => {
      setFps(displayFps);
    };

    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  return fps;
}

function computeFps() {
  if (frameCount < 2) {
    return 0;
  }

  const oldestIndex = frameCount === BUFFER_SIZE ? writeIndex : 0;
  const newestIndex = (writeIndex - 1 + BUFFER_SIZE) % BUFFER_SIZE;
  const oldest = frameTimes[oldestIndex];
  const newest = frameTimes[newestIndex];

  if (!oldest || !newest || newest <= oldest) {
    return displayFps;
  }

  return Math.round(((frameCount - 1) * 1000) / (newest - oldest));
}

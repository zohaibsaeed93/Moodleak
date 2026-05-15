import { useEffect, useRef } from "react";

export function useAnimationFrame(
  callback: (time: DOMHighResTimeStamp, delta: number) => void,
  active = true
) {
  const frameRef = useRef<number | null>(null);
  const previousTimeRef = useRef<DOMHighResTimeStamp | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const tick = (time: DOMHighResTimeStamp) => {
      const previousTime = previousTimeRef.current ?? time;
      const delta = time - previousTime;
      previousTimeRef.current = time;
      callbackRef.current(time, delta);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
      previousTimeRef.current = null;
    };
  }, [active]);
}

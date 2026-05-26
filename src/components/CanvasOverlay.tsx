"use client";

import type {
  HandLandmarkerResult,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { RefObject, useEffect, useRef } from "react";
import { loadFaceLandmarker, smoothFaceResult } from "@/lib/mediapipe/face";
import { loadHandLandmarker, smoothHandResult } from "@/lib/mediapipe/hands";
import { loadPoseLandmarker, smoothPoseResult } from "@/lib/mediapipe/pose";
import { initSegmenter } from "@/lib/mediapipe/segmentation";
import { clearCanvas, drawTrackingResults } from "@/lib/drawing/drawLandmarks";
import { recordFrame } from "@/lib/utils/fps";
import { useBackgroundStore } from "@/store/backgroundStore";
import { useTrackingStore } from "@/store/trackingStore";

const SEGMENTATION_WIDTH = 320;
const SEGMENTATION_HEIGHT = 240;
const SEGMENTATION_FRAME_STRIDE = 3;
const HAND_FRAME_STRIDE = 2;
const POSE_FRAME_STRIDE = 3;
const STATS_UPDATE_INTERVAL_MS = 500;

type CanvasOverlayProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
};

export function CanvasOverlay({ videoRef }: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const segmenterRef = useRef<Awaited<ReturnType<typeof initSegmenter>> | null>(
    null,
  );
  const segmenterPromiseRef = useRef<Promise<Awaited<
    ReturnType<typeof initSegmenter>
  > | null> | null>(null);
  const personCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarksCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const segmentationCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameCountRef = useRef(0);
  const maskReadyRef = useRef(false);
  const previousModeRef = useRef<DrawBackgroundLayerParams["mode"]>("none");
  const detectorFrameRef = useRef(0);
  const lastHandsRef = useRef<HandLandmarkerResult | null>(null);
  const lastPoseRef = useRef<PoseLandmarkerResult | null>(null);
  const lastStatsUpdateRef = useRef(0);
  const lastSegmentationTimestampRef = useRef(0);
  const segmenterClosedRef = useRef(false);
  const segmenterCrashed = useRef(false);
  const lastStatsRef = useRef({
    faceCount: 0,
    handCount: 0,
    poseActive: false,
  });
  const maskImageDataRef = useRef<ImageData | null>(null);
  const imageCacheRef = useRef<ImageCacheState>({
    url: null,
    image: null,
    status: "idle",
  });
  const webcamReady = useTrackingStore((state) => state.webcamReady);

  useEffect(() => {
    if (!webcamReady) {
      return;
    }

    let cancelled = false;
    const store = useTrackingStore.getState();
    store.setInitialized(false);

    async function initializeAndRun() {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (!canvas || !video) {
        return;
      }

      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) {
        return;
      }

      try {
        const [faceLandmarker, handLandmarker, poseLandmarker] =
          await Promise.all([
            loadFaceLandmarker(),
            loadHandLandmarker(),
            loadPoseLandmarker(),
          ]);

        if (cancelled) {
          return;
        }

        useTrackingStore.getState().setInitialized(true);
        const resizeCanvas = () => {
          const width = video.videoWidth;
          const height = video.videoHeight;

          if (!width || !height) {
            return;
          }

          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }

          personCanvasRef.current = ensureCanvasSize(
            personCanvasRef.current,
            width,
            height,
          );
          landmarksCanvasRef.current = ensureCanvasSize(
            landmarksCanvasRef.current,
            width,
            height,
          );
          segmentationCanvasRef.current = ensureCanvasSize(
            segmentationCanvasRef.current,
            SEGMENTATION_WIDTH,
            SEGMENTATION_HEIGHT,
          );
          maskCanvasRef.current = ensureCanvasSize(
            maskCanvasRef.current,
            SEGMENTATION_WIDTH,
            SEGMENTATION_HEIGHT,
          );
        };

        const ensureSegmenterLoaded = () => {
          if (segmenterRef.current || segmenterPromiseRef.current) {
            return;
          }

          segmenterPromiseRef.current = initSegmenter()
            .then((segmenter) => {
              if (!cancelled) {
                segmenterRef.current = segmenter;
                segmenterClosedRef.current = false;
                segmenterCrashed.current = false;
              }
              return segmenter;
            })
            .catch((error) => {
              console.error("Image segmenter initialization failed", error);
              return null;
            })
            .finally(() => {
              segmenterPromiseRef.current = null;
            });
        };

        const disposeSegmenter = () => {
          segmenterRef.current?.close();
          segmenterRef.current = null;
          segmenterPromiseRef.current = null;
          maskReadyRef.current = false;
          maskImageDataRef.current = null;
          lastSegmentationTimestampRef.current = 0;
          segmenterClosedRef.current = true;
        };

        const scheduleFrame = () => {
          timeoutRef.current = window.setTimeout(() => {
            requestRef.current = requestAnimationFrame(tick);
          }, 0);
        };

        const tick = (time: DOMHighResTimeStamp) => {
          if (cancelled) {
            return;
          }

          resizeCanvas();

          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const videoTime = video.currentTime;
            const now = performance.now();

            if (videoTime !== lastVideoTimeRef.current) {
              lastVideoTimeRef.current = videoTime;
              detectorFrameRef.current += 1;
              const detectorFrame = detectorFrameRef.current;

              const face = smoothFaceResult(
                faceLandmarker.detectForVideo(video, now),
              );

              if (
                detectorFrame % HAND_FRAME_STRIDE === 0 ||
                !lastHandsRef.current
              ) {
                lastHandsRef.current = smoothHandResult(
                  handLandmarker.detectForVideo(video, now),
                );
              }

              if (
                detectorFrame % POSE_FRAME_STRIDE === 0 ||
                !lastPoseRef.current
              ) {
                lastPoseRef.current = smoothPoseResult(
                  poseLandmarker.detectForVideo(video, now),
                );
              }

              const hands = lastHandsRef.current;
              const pose = lastPoseRef.current;
              const results = {
                face,
                hands,
                pose,
                timestamp: now,
              };

              const { mode, blurAmount, color, imageUrl } =
                useBackgroundStore.getState();
              const previousMode = previousModeRef.current;
              const modeChanged = previousMode !== mode;

              if (modeChanged) {
                previousModeRef.current = mode;
                frameCountRef.current = 0;

                if (mode === "none") {
                  disposeSegmenter();
                } else if (previousMode === "none") {
                  ensureSegmenterLoaded();
                  segmenterCrashed.current = false;
                }
              }

              useTrackingStore.getState().setTrackingResults(results);
              const faceCount = results.face?.faceLandmarks.length ?? 0;
              const handCount = results.hands?.landmarks.length ?? 0;
              const poseActive = (results.pose?.landmarks.length ?? 0) > 0;

              if (
                now - lastStatsUpdateRef.current >=
                STATS_UPDATE_INTERVAL_MS
              ) {
                const lastStats = lastStatsRef.current;
                if (
                  lastStats.faceCount !== faceCount ||
                  lastStats.handCount !== handCount ||
                  lastStats.poseActive !== poseActive
                ) {
                  useTrackingStore.getState().setTrackingStats({
                    faceCount,
                    handCount,
                    poseActive,
                  });
                  lastStatsRef.current = { faceCount, handCount, poseActive };
                }
                lastStatsUpdateRef.current = now;
              }

              if (mode === "none") {
                drawTrackingResults(ctx, canvas, results, { mirrored: true });
              } else {
                const personCanvas = personCanvasRef.current;
                const landmarksCanvas = landmarksCanvasRef.current;
                const segmentationCanvas = segmentationCanvasRef.current;
                const maskCanvas = maskCanvasRef.current;

                if (
                  personCanvas &&
                  landmarksCanvas &&
                  segmentationCanvas &&
                  maskCanvas
                ) {
                  const personCtx = personCanvas.getContext("2d");
                  const segmentationCtx = segmentationCanvas.getContext("2d");
                  const maskCtx = maskCanvas.getContext("2d");
                  const landmarksCtx = landmarksCanvas.getContext("2d", {
                    alpha: true,
                  });

                  if (personCtx && segmentationCtx && maskCtx && landmarksCtx) {
                    drawBackgroundLayer(ctx, {
                      mode,
                      blurAmount,
                      color,
                      imageUrl,
                      video,
                      width: canvas.width,
                      height: canvas.height,
                      cache: imageCacheRef.current,
                    });

                    clearCanvas(personCtx, canvas);
                    drawMirroredVideo(
                      personCtx,
                      video,
                      canvas.width,
                      canvas.height,
                    );

                    let segmenter = segmenterRef.current;

                    frameCountRef.current += 1;
                    const shouldRunSegmentation =
                      frameCountRef.current % SEGMENTATION_FRAME_STRIDE === 0 ||
                      !maskReadyRef.current;

                    if (
                      segmenter &&
                      !segmenterClosedRef.current &&
                      shouldRunSegmentation &&
                      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
                      now > lastSegmentationTimestampRef.current
                    ) {
                      try {
                        clearCanvas(segmentationCtx, {
                          width: segmentationCanvas.width,
                          height: segmentationCanvas.height,
                        });
                        drawMirroredVideo(
                          segmentationCtx,
                          video,
                          segmentationCanvas.width,
                          segmentationCanvas.height,
                        );

                        const segmentation = segmenter.segmentForVideo(
                          segmentationCanvas,
                          now,
                        ) as { categoryMask?: SegmentMask | null } | undefined;
                        lastSegmentationTimestampRef.current = now;

                        const mask = segmentation?.categoryMask ?? null;
                        const maskValues = mask?.getAsFloat32Array?.() ?? null;

                        if (mask && maskValues) {
                          const maskSize = resolveMaskSize(
                            mask,
                            segmentationCanvas,
                          );
                          const maskUpdated = updateMaskCanvas(
                            maskCtx,
                            maskValues,
                            maskSize.width,
                            maskSize.height,
                            maskImageDataRef,
                          );
                          maskReadyRef.current = maskUpdated;
                        } else {
                          maskReadyRef.current = false;
                        }
                      } catch (error) {
                        if (!segmenterCrashed.current) {
                          console.error(
                            "[segmenter] disabled after crash:",
                            error,
                          );
                          segmenterCrashed.current = true;
                        }
                        segmenter = null;
                        segmenterRef.current = null;
                        segmenterPromiseRef.current = null;
                        segmenterClosedRef.current = true;
                        maskReadyRef.current = false;
                      }
                    }

                    if (maskReadyRef.current) {
                      personCtx.save();
                      personCtx.globalCompositeOperation = "destination-in";
                      personCtx.imageSmoothingEnabled = true;
                      personCtx.drawImage(
                        maskCanvas,
                        0,
                        0,
                        canvas.width,
                        canvas.height,
                      );
                      personCtx.restore();
                    }

                    ctx.drawImage(personCanvas, 0, 0);

                    drawTrackingResults(
                      landmarksCtx,
                      landmarksCanvas,
                      results,
                      {
                        mirrored: true,
                      },
                    );
                    ctx.drawImage(landmarksCanvas, 0, 0);
                  }
                }
              }

              recordFrame(now);
            }
          } else {
            clearCanvas(ctx, canvas);
          }

          scheduleFrame();
        };

        scheduleFrame();
      } catch (error) {
        console.error("MediaPipe initialization failed", error);
        useTrackingStore.getState().setInitialized(false);
      }
    }

    initializeAndRun();

    return () => {
      cancelled = true;
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      requestRef.current = null;
      timeoutRef.current = null;
      segmenterRef.current = null;
      segmenterPromiseRef.current = null;
      useTrackingStore.getState().setInitialized(false);
    };
  }, [videoRef, webcamReady]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}

type SegmentMask = {
  getAsFloat32Array?: () => Float32Array;
  width?: number;
  height?: number;
};

type ImageCacheState = {
  url: string | null;
  image: HTMLImageElement | null;
  status: "idle" | "loading" | "ready" | "error";
};

type DrawBackgroundLayerParams = {
  mode: "none" | "blur" | "color" | "image";
  blurAmount: number;
  color: string;
  imageUrl: string | null;
  video: HTMLVideoElement;
  width: number;
  height: number;
  cache: ImageCacheState;
};

function ensureCanvasSize(
  canvas: HTMLCanvasElement | null,
  width: number,
  height: number,
) {
  const next = canvas ?? document.createElement("canvas");
  if (next.width !== width || next.height !== height) {
    next.width = width;
    next.height = height;
  }
  return next;
}

function drawMirroredVideo(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  overscan = 1,
) {
  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);

  if (overscan === 1) {
    ctx.drawImage(video, 0, 0, width, height);
  } else {
    const drawWidth = width * overscan;
    const drawHeight = height * overscan;
    const offsetX = (drawWidth - width) / 2;
    const offsetY = (drawHeight - height) / 2;
    ctx.drawImage(video, -offsetX, -offsetY, drawWidth, drawHeight);
  }

  ctx.restore();
}

function drawBackgroundLayer(
  ctx: CanvasRenderingContext2D,
  params: DrawBackgroundLayerParams,
) {
  const { mode, blurAmount, color, imageUrl, video, width, height, cache } =
    params;

  clearCanvas(ctx, { width, height });

  if (mode === "blur") {
    ctx.save();
    ctx.filter = `blur(${blurAmount}px)`;
    drawMirroredVideo(ctx, video, width, height, 1.08);
    ctx.restore();
    return;
  }

  if (mode === "color") {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (mode === "image") {
    const image = loadBackgroundImage(cache, imageUrl);
    if (image) {
      drawImageCover(ctx, image, width, height);
      return;
    }

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);
    return;
  }

  drawMirroredVideo(ctx, video, width, height);
}

function loadBackgroundImage(cache: ImageCacheState, imageUrl: string | null) {
  if (!imageUrl) {
    cache.url = null;
    cache.image = null;
    cache.status = "idle";
    return null;
  }

  if (cache.url === imageUrl) {
    return cache.status === "ready" ? cache.image : null;
  }

  cache.url = imageUrl;
  cache.image = null;
  cache.status = "loading";

  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.onload = () => {
    if (cache.url === imageUrl) {
      cache.image = image;
      cache.status = "ready";
    }
  };
  image.onerror = () => {
    if (cache.url === imageUrl) {
      cache.image = null;
      cache.status = "error";
    }
  };
  image.src = imageUrl;

  return null;
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;

  if (!imageWidth || !imageHeight) {
    return;
  }

  const scale = Math.max(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function resolveMaskSize(
  mask: SegmentMask,
  fallback: { width: number; height: number },
) {
  const width = Number(mask.width ?? fallback.width);
  const height = Number(mask.height ?? fallback.height);

  if (
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    return { width: fallback.width, height: fallback.height };
  }

  return { width, height };
}

function updateMaskCanvas(
  ctx: CanvasRenderingContext2D,
  values: Float32Array,
  width: number,
  height: number,
  imageDataRef: ImageDataRef,
) {
  const expectedLength = width * height;
  if (values.length < expectedLength) {
    return false;
  }

  if (ctx.canvas.width !== width || ctx.canvas.height !== height) {
    ctx.canvas.width = width;
    ctx.canvas.height = height;
  }

  let imageData = imageDataRef.current;
  if (!imageData || imageData.width !== width || imageData.height !== height) {
    imageData = ctx.createImageData(width, height);
    imageDataRef.current = imageData;
  }
  const data = imageData.data;

  for (let index = 0; index < expectedLength; index += 1) {
    const offset = index * 4;
    const isPerson = values[index] < 0.5;
    data[offset] = 255;
    data[offset + 1] = 255;
    data[offset + 2] = 255;
    data[offset + 3] = isPerson ? 255 : 0;
  }

  ctx.putImageData(imageData, 0, 0);
  return true;
}

type ImageDataRef = {
  current: ImageData | null;
};

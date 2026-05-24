const POOL_SIZE = 4;
const audioPool: HTMLAudioElement[] = [];
let poolIndex = 0;

function ensurePool() {
  if (audioPool.length) {
    return;
  }

  for (let i = 0; i < POOL_SIZE; i += 1) {
    const audio = new Audio();
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audioPool.push(audio);
  }
}

export function playSound(src: string) {
  if (typeof window === "undefined") {
    return;
  }

  ensurePool();

  const audio = audioPool[poolIndex];
  poolIndex = (poolIndex + 1) % audioPool.length;

  if (!audio) {
    return;
  }

  if (audio.src !== src) {
    audio.src = src;
  }

  audio.currentTime = 0;
  audio.play().catch(() => {
    // Ignore play errors caused by autoplay restrictions.
  });
}

export type GestureState = "idle" | "candidate" | "active" | "cooling";

type StabilizerOptions = {
  requiredFrames?: number;
  cooldownMs?: number;
};

export class GestureStabilizer {
  private state: GestureState = "idle";
  private consecutiveFrames = 0;
  private cooldownUntil = 0;
  private readonly requiredFrames: number;
  private readonly cooldownMs: number;

  constructor({
    requiredFrames = 4,
    cooldownMs = 1200,
  }: StabilizerOptions = {}) {
    this.requiredFrames = requiredFrames;
    this.cooldownMs = cooldownMs;
  }

  update(isDetected: boolean, now: number) {
    let emit = false;

    switch (this.state) {
      case "idle":
        if (isDetected) {
          this.state = "candidate";
          this.consecutiveFrames = 1;
        }
        break;
      case "candidate":
        if (isDetected) {
          this.consecutiveFrames += 1;
          if (
            this.consecutiveFrames >= this.requiredFrames &&
            now >= this.cooldownUntil
          ) {
            this.state = "active";
            emit = true;
          }
        } else {
          this.state = "idle";
          this.consecutiveFrames = 0;
        }
        break;
      case "active":
        if (!isDetected) {
          this.state = "cooling";
          this.cooldownUntil = now + this.cooldownMs;
          this.consecutiveFrames = 0;
        }
        break;
      case "cooling":
        if (isDetected) {
          this.state = "candidate";
          this.consecutiveFrames = 1;
        } else if (now >= this.cooldownUntil) {
          this.state = "idle";
        }
        break;
      default:
        this.state = "idle";
        this.consecutiveFrames = 0;
        this.cooldownUntil = 0;
        break;
    }

    return { emit, state: this.state };
  }

  getState() {
    return this.state;
  }

  reset() {
    this.state = "idle";
    this.consecutiveFrames = 0;
    this.cooldownUntil = 0;
  }
}

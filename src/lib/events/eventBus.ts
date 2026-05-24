export type ReactionEventPayload = {
  confidence: number;
  timestamp: number;
};

export const EVENT_NAMES = [
  "SMILE_DETECTED",
  "PEACE_SIGN_DETECTED",
  "THUMBS_UP_DETECTED",
  "ARMS_RAISED_DETECTED",
  "SAD_DETECTED",
  "SURPRISED_DETECTED"
] as const;

export type ReactionEventName = (typeof EVENT_NAMES)[number];

export type ReactionEventMap = {
  [K in ReactionEventName]: ReactionEventPayload;
};

type Handler<T> = (event: T) => void;

type HandlerMap<Events extends Record<string, unknown>> = {
  [K in keyof Events]?: Set<Handler<Events[K]>>;
};

class TypedEventBus<Events extends Record<string, unknown>> {
  private handlers: HandlerMap<Events> = {};

  on<K extends keyof Events>(type: K, handler: Handler<Events[K]>) {
    if (!this.handlers[type]) {
      this.handlers[type] = new Set();
    }
    this.handlers[type]?.add(handler);
  }

  off<K extends keyof Events>(type: K, handler: Handler<Events[K]>) {
    this.handlers[type]?.delete(handler);
  }

  emit<K extends keyof Events>(type: K, event: Events[K]) {
    this.handlers[type]?.forEach((handler) => handler(event));
  }
}

export const eventBus = new TypedEventBus<ReactionEventMap>();

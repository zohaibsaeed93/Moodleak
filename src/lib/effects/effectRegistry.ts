import type { ReactionEventName } from "@/lib/events/eventBus";

export type ReactionConfig = {
  label: string;
  emoji: string;
  gifUrl: string;
  duration: number;
  color: string;
};

const NOTO_ANIM_BASE =
  "https://raw.githubusercontent.com/googlefonts/noto-emoji/main/animated";

export const reactionRegistry: Record<ReactionEventName, ReactionConfig> = {
  PEACE_SIGN_DETECTED: {
    label: "Peace Out",
    emoji: "✌️",
    gifUrl: `${NOTO_ANIM_BASE}/emoji_u1f93f.gif`,
    duration: 2200,
    color: "#38bdf8",
  },
  SMILE_DETECTED: {
    label: "Vibing",
    emoji: "😊",
    gifUrl: `${NOTO_ANIM_BASE}/emoji_u1f60a.gif`,
    duration: 1800,
    color: "#22c55e",
  },
  THUMBS_UP_DETECTED: {
    label: "Solid",
    emoji: "👍",
    gifUrl: `${NOTO_ANIM_BASE}/emoji_u1f44d.gif`,
    duration: 1800,
    color: "#60a5fa",
  },
  ARMS_RAISED_DETECTED: {
    label: "Let's Go",
    emoji: "🙌",
    gifUrl: `${NOTO_ANIM_BASE}/emoji_u1f64c.gif`,
    duration: 2000,
    color: "#f97316",
  },
  SAD_DETECTED: {
    label: "L Detected",
    emoji: "😢",
    gifUrl: `${NOTO_ANIM_BASE}/emoji_u1f622.gif`,
    duration: 2000,
    color: "#94a3b8",
  },
  SURPRISED_DETECTED: {
    label: "NO WAY",
    emoji: "😮",
    gifUrl: `${NOTO_ANIM_BASE}/emoji_u1f62e.gif`,
    duration: 1900,
    color: "#fbbf24",
  },
  COMBO_W_DETECTED: {
    label: "W Detected",
    emoji: "🏆",
    gifUrl: "https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif",
    duration: 2400,
    color: "#22c55e",
  },
  COMBO_NPC_DETECTED: {
    label: "NPC Mode",
    emoji: "😐",
    gifUrl: "https://media.giphy.com/media/9J7tdYltWyXIY/giphy.gif",
    duration: 2400,
    color: "#6b7280",
  },
  COMBO_GIGACHAD_DETECTED: {
    label: "GigaChad",
    emoji: "🗿",
    gifUrl: "https://media.giphy.com/media/ISOckXUybVfQ4/giphy.gif",
    duration: 2500,
    color: "#f59e0b",
  },
  COMBO_L_DETECTED: {
    label: "L Detected",
    emoji: "💀",
    gifUrl: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
    duration: 2400,
    color: "#ef4444",
  },
  COMBO_CAUGHT_DETECTED: {
    label: "Caught",
    emoji: "🕵️",
    gifUrl: "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif",
    duration: 2400,
    color: "#f97316",
  },
};

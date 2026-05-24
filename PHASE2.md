# MoodLeak Phase 2 - Reaction Engine

## Event names
- SMILE_DETECTED
- PEACE_SIGN_DETECTED
- THUMBS_UP_DETECTED
- ARMS_RAISED_DETECTED
- SAD_DETECTED
- SURPRISED_DETECTED

Each event payload is:
- confidence: number
- timestamp: number

## Add a new reaction
1. Add or update the mapping in src/lib/effects/effectRegistry.ts.
2. If it is a new event, also add the event name to src/lib/events/eventBus.ts.
3. Provide a label, emoji, gifUrl, duration, and accent color.

## Add a new gesture
1. Implement the evaluator in src/lib/gestures/gestureEmitter.ts.
2. If it is a new event, add it to src/lib/events/eventBus.ts and map it in src/lib/effects/effectRegistry.ts.
3. Keep all threshold and cooldown logic inside gestureEmitter.ts.

## Pipeline overview
gestureEmitter.ts -> eventBus.ts -> effectRegistry.ts -> ReactionPanel.tsx

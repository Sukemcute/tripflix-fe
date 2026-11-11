import { ReduceMotion } from 'react-native-reanimated';

/** Sheets settle without bouncing, and the springs keep a finger's velocity when one is passed in. */
export const SHEET_OPEN_SPRING = {
  duration: 450,
  dampingRatio: 1,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
} as const;

export const CHROME_FADE = {
  duration: 200,
  reduceMotion: ReduceMotion.System,
} as const;

/** A small, playful bounce, kept for selecting something like a heart. */
export const HEART_POP_UP = {
  duration: 90,
  reduceMotion: ReduceMotion.System,
} as const;

/** Thu nhỏ khi ngón tay chạm nút, đủ nhanh để thấy ngay. */
export const PRESS_DOWN = {
  duration: 80,
  reduceMotion: ReduceMotion.System,
} as const;

export const HEART_POP_SETTLE = {
  duration: 320,
  dampingRatio: 0.5,
  reduceMotion: ReduceMotion.System,
} as const;

/** Quick enough to feel attached when something settles onto the nearest slot. */
export const SNAP_SPRING = {
  duration: 180,
  dampingRatio: 1,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
} as const;

export const SHEET_CLOSE_SPRING = {
  duration: 300,
  dampingRatio: 1,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
} as const;

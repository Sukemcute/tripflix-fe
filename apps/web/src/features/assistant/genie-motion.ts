export const GENIE_OPEN_MS = 720;
export const GENIE_CLOSE_MS = 680;

export function smoothGenieProgress(progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function phase(progress: number, start: number, end: number): number {
  return smoothGenieProgress((progress - start) / (end - start));
}

export type GenieSurface = {
  left: number;
  top: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
};

/** Mỗi hàng lưới đi theo một nhịp riêng; UV giữ nguyên để chữ cũng uốn theo tấm vải. */
export function getGenieVertex(
  u: number,
  v: number,
  openness: number,
  surface: GenieSurface,
): { x: number; y: number; shade: number } {
  const close = 1 - Math.max(0, Math.min(1, openness));
  const pullX = phase(close, v * 0.16, 0.72 + v * 0.28);
  const pullY = phase(close, 0.1 + v * 0.16, 0.86 + v * 0.14);
  const envelope = Math.sin(Math.PI * close) * Math.sin(Math.PI * v);
  const fold = envelope * Math.sin(v * Math.PI * 2.2 - close * 3.2);
  const crease = envelope * Math.sin(u * Math.PI * 2 + v * 1.8 - close * 3);
  return {
    x:
      (surface.left + u * surface.width) * (1 - pullX) +
      (surface.anchorX + (u - 0.5) * 5) * pullX +
      fold * surface.width * 0.055 +
      crease * Math.sin(Math.PI * u) * surface.width * 0.018,
    y:
      (surface.top + v * surface.height) * (1 - pullY) +
      (surface.anchorY + (v - 0.5) * 3) * pullY +
      crease * surface.height * 0.009,
    shade: 1 - Math.abs(crease) * 0.055 + fold * 0.025,
  };
}

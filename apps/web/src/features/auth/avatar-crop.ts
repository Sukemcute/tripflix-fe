/** Khung cắt avatar hình vuông: ảnh luôn phủ kín khung, kéo không lộ nền trống. */
export interface CropView {
  /** Góc trái trên của ảnh so với khung, px màn hình (luôn ≤ 0). */
  x: number;
  y: number;
  /** px màn hình trên mỗi px ảnh. */
  scale: number;
}

export const MAX_ZOOM = 4;

/** Tỉ lệ nhỏ nhất để cạnh ngắn của ảnh vừa khít khung. */
export function coverScale(frame: number, width: number, height: number): number {
  return frame / Math.min(width, height);
}

/** Giữ ảnh phủ kín khung. */
export function clampView(view: CropView, frame: number, width: number, height: number): CropView {
  const clamp = (value: number, size: number) => Math.min(0, Math.max(frame - size * view.scale, value));
  return { scale: view.scale, x: clamp(view.x, width), y: clamp(view.y, height) };
}

/** Ảnh mới mở: phủ kín khung, nằm giữa. */
export function initialView(frame: number, width: number, height: number): CropView {
  const scale = coverScale(frame, width, height);
  return { scale, x: (frame - width * scale) / 2, y: (frame - height * scale) / 2 };
}

/** Phóng to hoặc thu nhỏ quanh tâm khung (zoom 1 = vừa khít, tối đa MAX_ZOOM). */
export function zoomView(view: CropView, zoom: number, frame: number, width: number, height: number): CropView {
  const scale = coverScale(frame, width, height) * Math.min(MAX_ZOOM, Math.max(1, zoom));
  const centerX = (frame / 2 - view.x) / view.scale;
  const centerY = (frame / 2 - view.y) / view.scale;
  return clampView({ scale, x: frame / 2 - centerX * scale, y: frame / 2 - centerY * scale }, frame, width, height);
}

/** Vùng ảnh gốc (px ảnh) nằm trong khung, để vẽ ra canvas. */
export function sourceRect(view: CropView, frame: number): { sx: number; sy: number; size: number } {
  return { sx: (0 - view.x) / view.scale, sy: (0 - view.y) / view.scale, size: frame / view.scale };
}

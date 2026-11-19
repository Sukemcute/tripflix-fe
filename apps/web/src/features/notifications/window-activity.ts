/** Chỉ coi là đang dùng Web khi tab hiển thị và thực sự nhận tương tác bàn phím. */
export function isWindowActive(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus();
}

/** Thẻ trong trang không cần đợi người dùng bấm để nhận keyboard focus. */
export function isWindowVisible(): boolean {
  return document.visibilityState === 'visible';
}

export function subscribeWindowActivity(onChange: () => void): () => void {
  window.addEventListener('focus', onChange);
  window.addEventListener('blur', onChange);
  document.addEventListener('visibilitychange', onChange);
  return () => {
    window.removeEventListener('focus', onChange);
    window.removeEventListener('blur', onChange);
    document.removeEventListener('visibilitychange', onChange);
  };
}

export function inactiveWindowSnapshot(): boolean {
  return false;
}

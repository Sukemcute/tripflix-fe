/** Đọc mã từ #code=… rồi xoá khỏi địa chỉ để mã không nằm lại trong lịch sử trình duyệt. */
export function takeHandoffCode(
  location: Pick<Location, 'hash' | 'pathname'>,
  history: Pick<History, 'replaceState'>,
): string | null {
  const code = new URLSearchParams(location.hash.slice(1)).get('code');
  history.replaceState(null, '', location.pathname);
  return code;
}

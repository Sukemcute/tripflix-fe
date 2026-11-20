'use client';

import { t } from '@tripflix/i18n';
import { useCallback } from 'react';
import type { DrawerNavigation } from './detail-drawer';
import { getNeighbors } from './detail-navigation';
import { useUrlParams } from './use-url-params';

const OPENED_BY_USER = 'admDetail';

/**
 * Hồ sơ đang mở nằm trong URL (`?id=`): F5 và link chia sẻ mở lại đúng hồ sơ.
 * - Mở từ danh sách: thêm một mục lịch sử, nên nút Back đóng drawer.
 * - Chuyển sang hồ sơ khác khi drawer đang mở (hàng khác, J/K): thay mục hiện tại, không thêm lịch sử.
 * - `close` (người dùng đóng): quay lại mục lịch sử trước nếu chính ta đã thêm nó, nếu không (mở bằng link) thì chỉ bỏ `id`.
 * - `clear`: bỏ `id` ngay (khi bộ lọc đổi làm hồ sơ không còn phù hợp).
 */
export function useDetailParam(key = 'id') {
  const { params, update } = useUrlParams();
  const openId = params.get(key);

  const open = useCallback(
    (id: string) => {
      const isSwitching = new URLSearchParams(window.location.search).has(key);
      if (isSwitching) {
        const wasOpenedByUser = window.history.state?.[OPENED_BY_USER] === true;
        update({ [key]: id }, { state: wasOpenedByUser ? { [OPENED_BY_USER]: true } : undefined });
      } else update({ [key]: id }, { push: true, state: { [OPENED_BY_USER]: true } });
    },
    [key, update],
  );
  const close = useCallback(() => {
    if (window.history.state?.[OPENED_BY_USER] === true) window.history.back();
    else update({ [key]: null });
  }, [key, update]);
  const clear = useCallback(() => update({ [key]: null }), [key, update]);

  return { openId, open, close, clear };
}

/**
 * Nút/phím chuyển hồ sơ trước/sau cho drawer, theo thứ tự danh sách đang hiển thị.
 * Hồ sơ "hiện tại" được đọc từ URL lúc bấm (không dùng giá trị lúc render), để bấm liên tiếp nhanh
 * (giữ phím J/K) không tính lệch khi React chưa kịp vẽ lại.
 */
export function buildDrawerNavigation(
  ids: readonly string[],
  currentId: string,
  open: (id: string) => void,
  key = 'id',
): DrawerNavigation | undefined {
  const { position, total, previousId, nextId } = getNeighbors(ids, currentId);
  if (position === 0) return undefined;
  const go = (pick: 'previousId' | 'nextId') => () => {
    const liveId =
      typeof window === 'undefined'
        ? currentId
        : (new URLSearchParams(window.location.search).get(key) ?? currentId);
    const target = getNeighbors(ids, liveId)[pick];
    if (target) open(target);
  };
  return {
    position: t('adminOperations.drawer.position', { current: position, total }),
    onPrevious: previousId ? go('previousId') : undefined,
    onNext: nextId ? go('nextId') : undefined,
  };
}

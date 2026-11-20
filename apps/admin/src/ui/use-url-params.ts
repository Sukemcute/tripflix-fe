'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { applyParamPatch, type ParamPatch } from './url-params';

/**
 * Trạng thái màn hình (tab, bộ lọc, trang, hồ sơ đang mở) nằm trong URL để F5, Back và chia sẻ link giữ nguyên ngữ cảnh.
 * Mặc định dùng replaceState (không thêm mục lịch sử cho mỗi lần gõ/lọc); `push: true` cho việc mở một hồ sơ.
 * Component dùng hook này phải nằm trong <Suspense> (Next yêu cầu với useSearchParams).
 */
export function useUrlParams() {
  const params = useSearchParams();
  const pathname = usePathname();
  const update = useCallback(
    (patch: ParamPatch, options: { push?: boolean } = {}) => {
      const search = applyParamPatch(window.location.search, patch);
      const url = search ? `${pathname}?${search}` : pathname;
      if (options.push) window.history.pushState(null, '', url);
      else window.history.replaceState(null, '', url);
    },
    [pathname],
  );
  return { params, update };
}

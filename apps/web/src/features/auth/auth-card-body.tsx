'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Thân thẻ form: chiều cao chạy mượt theo nội dung (đăng nhập ↔ đăng ký, bước 1 ↔ bước 2) thay vì nhảy.
 * Đo nội dung bằng ResizeObserver rồi đặt chiều cao cho khung ngoài để CSS chạy transition.
 */
export function AuthCardBody({ children }: { children: ReactNode }) {
  const content = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const element = content.current;
    if (!element) return;
    // Khúc xạ của thẻ kính dùng bộ lọc SVG trong backdrop-filter: chỉ Chromium vẽ được, trình duyệt khác giữ kính mờ.
    const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } })
      .userAgentData?.brands;
    if (brands?.some(({ brand }) => brand === 'Chromium')) {
      element.closest('.auth-panel-inner')?.classList.add('has-refraction');
    }
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="auth-card-body" style={height === undefined ? undefined : { height }}>
      <div ref={content} className="auth-card-stack">
        {children}
      </div>
    </div>
  );
}

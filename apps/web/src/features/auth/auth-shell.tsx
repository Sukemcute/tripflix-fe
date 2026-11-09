import { vi } from '@tripflix/i18n';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AuthCardBody } from './auth-card-body';
import { AuthSplitFrame } from './auth-split-frame';

/** Logo bấm về trang chủ: các trang đăng nhập, đăng ký không có header chung của web. */
function AuthLogo({ width = 132 }: { width?: number }) {
  return (
    <Link className="auth-logo" href="/" aria-label={vi.api.authHomeLink}>
      <Image
        src="/brand/tripflix-logo.svg"
        alt={vi.demo.common.logo}
        width={width}
        height={Math.round(width * 0.3)}
        priority
      />
    </Link>
  );
}

/** Cụm ảnh trang trí bên trái: ảnh chuyến đi xếp chồng, nhãn đánh giá, tim và mascot. */
function AuthCollage() {
  return (
    <div className="auth-collage" aria-hidden="true">
      <span className="auth-photo auth-photo-side">
        <Image src="/brand/hoian.jpg" alt="" fill sizes="240px" />
      </span>
      <span className="auth-photo auth-photo-main">
        <Image src="/brand/home-surf.jpg" alt="" fill sizes="320px" priority />
        <span className="auth-photo-progress" />
      </span>
      <span className="auth-photo-card">
        <span className="auth-photo-card-image">
          <Image src="/brand/hotel.jpg" alt="" fill sizes="200px" />
        </span>
        <span className="auth-photo-card-line" />
        <span className="auth-photo-card-line is-short" />
      </span>
      <span className="auth-chip auth-chip-rating">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
        </svg>
        {vi.api.authHeroRating}
      </span>
      <span className="auth-chip auth-chip-saved">{vi.api.authHeroSaved}</span>
      <span className="auth-heart">
        <svg viewBox="0 0 24 24" width="30" height="30">
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
        </svg>
      </span>
      <span className="auth-mascot-ring">
        <Image src="/brand/tripi-welcome.png" alt="" width={180} height={180} />
      </span>
    </div>
  );
}

/**
 * Khung của nhóm trang app/(auth) (đăng nhập, đăng ký, quên/đặt lại mật khẩu, xác thực email): trái là logo,
 * cụm ảnh và lời chào lớn; phải là thẻ form. Không có header, footer chung (ẩn bằng CSS theo lớp auth-fullscreen).
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <AuthSplitFrame>
      {/* Ảnh phong cảnh phủ cả trang, làm mờ và phủ lớp sáng; thẻ form nổi bên trên. */}
      <span className="auth-hero-bg" aria-hidden="true">
        <Image src="/brand/destinations/quang-ninh-view.jpg" alt="" fill sizes="100vw" priority />
      </span>
      <section className="auth-hero">
        <AuthLogo />
        <AuthCollage />
        <h1 className="auth-headline">
          <span className="auth-headline-first">{vi.api.authHeroFirst}</span> <em>{vi.api.authHeroSecond}</em>
        </h1>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <AuthCardBody>{children}</AuthCardBody>
        </div>
      </section>
    </AuthSplitFrame>
  );
}

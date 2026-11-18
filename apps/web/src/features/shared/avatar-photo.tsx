'use client';

import { getAvatarUrl } from '@tripflix/api-client';
import { useState } from 'react';

/**
 * Ảnh đại diện (TF109) đặt chồng lên ô chữ cái đầu sẵn có: tải xong thì che chữ; chưa có ảnh (404) hay ảnh lỗi thì
 * gỡ đi để chữ cái hiện lại. Ô cha tự thành khung cắt tròn nhờ `:has(> .avatar-photo)` trong globals.css.
 * `src` có mặt (kể cả null) thì dùng nó thay cho link theo userId: hồ sơ của chính mình đã có avatarUrl mới nhất.
 */
export function AvatarPhoto({ userId, src }: { userId?: string | null | undefined; src?: string | null | undefined }) {
  const url = src === undefined ? (userId ? getAvatarUrl(userId) : null) : src;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!url || failedUrl === url) return null;
  // Google trả 403 khi có Referer lạ.
  return (
    // oxlint-disable-next-line nextjs/no-img-element -- link ngoài (CDN, ảnh Google) và link 302 theo id, next/image không tối ưu được
    <img
      className="avatar-photo"
      src={url}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailedUrl(url)}
    />
  );
}

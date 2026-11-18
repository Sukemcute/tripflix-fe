'use client';

import { getAvatarUrl } from '@tripflix/api-client';
import { useEffect, useState } from 'react';
import {
  AVATAR_DECOR_EVENT,
  findFrameOption,
  findStickerPreset,
  loadUserAvatarDecor,
  type StoredAvatarDecor,
} from '@/features/auth/avatar-stickers';

const EDITOR_CIRCLE_PX = 240;

/**
 * Ảnh đại diện (TF109) đặt chồng lên ô chữ cái đầu sẵn có, kèm lớp khung thú & phụ kiện bọc NGOÀI vòng tròn
 * (kiểu Discord Avatar Decorations) không bị cắt bởi border-radius của ảnh.
 */
export function AvatarPhoto({ userId, src }: { userId?: string | null | undefined; src?: string | null | undefined }) {
  const url = src === undefined ? (userId ? getAvatarUrl(userId) : null) : src;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [decor, setDecor] = useState<StoredAvatarDecor>({ frameId: 'none', stickers: [] });

  useEffect(() => {
    const sync = () => setDecor(loadUserAvatarDecor(userId));
    sync();
    window.addEventListener(AVATAR_DECOR_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(AVATAR_DECOR_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [userId]);

  const hasPhoto = Boolean(url && failedUrl !== url);
  const frameOption = findFrameOption(decor.frameId);
  const hasOuterOverlay = Boolean(frameOption?.overlaySrc) || decor.stickers.length > 0;

  if (!hasPhoto && !hasOuterOverlay) return null;

  return (
    <>
      {hasPhoto && url && (
        // oxlint-disable-next-line nextjs/no-img-element -- link ngoài (CDN, ảnh Google) và link 302 theo id, next/image không tối ưu được
        <img
          className="avatar-photo"
          src={url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{ width: '100%', height: '100%' }}
          onError={() => setFailedUrl(url)}
        />
      )}
      {frameOption?.overlaySrc && (
        // oxlint-disable-next-line nextjs/no-img-element -- khung SVG data URL bọc bên ngoài vòng tròn avatar
        <img
          className="avatar-outer-deco"
          src={frameOption.overlaySrc}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '147%',
            height: '147%',
            maxWidth: 'none',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      )}
      {decor.stickers.map((item) => {
        const preset = findStickerPreset(item.presetId);
        if (!preset) return null;
        const sizePct = ((preset.baseSizePx * item.scale) / EDITOR_CIRCLE_PX) * 100;
        return (
          // oxlint-disable-next-line nextjs/no-img-element -- phụ kiện/sticker tràn viền ngoài khung tròn avatar
          <img
            key={item.instanceId}
            className="avatar-outer-sticker"
            src={preset.src}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: `${sizePct}%`,
              height: `${sizePct}%`,
              left: `${item.x * 100}%`,
              top: `${item.y * 100}%`,
              maxWidth: 'none',
              transform: `translate(-50%, -50%) rotate(${item.rotationDeg}deg) scaleX(${item.isFlipped ? -1 : 1})`,
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </>
  );
}

'use client';

import { getAvatarUrl, useApiSession } from '@tripflix/api-client';
import * as users from '@tripflix/api-client/core-api/users/users';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { findFrameOption, findStickerPreset, type AvatarFrameId } from '@/features/auth/avatar-stickers';

const EDITOR_CIRCLE_PX = 240;

/**
 * Ảnh đại diện (TF109) đặt chồng lên ô chữ cái đầu sẵn có, kèm lớp khung thú & phụ kiện bọc NGOÀI vòng tròn
 * (kiểu Discord Avatar Decorations) không bị cắt bởi border-radius của ảnh.
 */
export function AvatarPhoto({
  userId,
  src,
}: {
  userId?: string | null | undefined;
  src?: string | null | undefined;
}) {
  const url = src === undefined ? (userId ? getAvatarUrl(userId) : null) : src;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const { user: me } = useApiSession();
  // Của chính mình (không truyền userId hoặc trùng id): lấy từ hồ sơ đã có, đổi xong hiện ngay. userId null: không rõ ai.
  const isMe = userId === undefined || userId === me?.id;
  const othersDecor = useQuery({
    queryKey: users.getUserSearchControllerAvatarDecorQueryKey(userId ?? ''),
    queryFn: async ({ signal }) =>
      (await users.userSearchControllerAvatarDecor(userId!, { signal })).data.avatarDecor,
    enabled: Boolean(userId) && !isMe,
    // Server cache 5 phút; mọi avatar của cùng một người dùng chung một lần gọi.
    staleTime: 5 * 60_000,
  });
  const decor = (isMe ? me?.avatarDecor : othersDecor.data) ?? { frameId: 'none', stickers: [] };

  const hasPhoto = Boolean(url && failedUrl !== url);
  const frameOption = findFrameOption(decor.frameId as AvatarFrameId);
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
        <img className="avatar-outer-deco" src={frameOption.overlaySrc} alt="" aria-hidden="true" />
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

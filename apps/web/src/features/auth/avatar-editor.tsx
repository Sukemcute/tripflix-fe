'use client';

import { resolveImageMimeType, uploadImage, useApiSession } from '@tripflix/api-client';
import * as auth from '@tripflix/api-client/core-api/auth/auth';
import type { MyProfileDto } from '@tripflix/api-client/core-api/model/index';
import { useMutation } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import { useRef, useState } from 'react';
import { AvatarPhoto } from '@/features/shared/avatar-photo';
import { getInitial } from './account-helpers';

/** Cạnh dài của ảnh sau khi thu nhỏ: đủ nét cho avatar 96px trên màn hình mật độ cao. */
const AVATAR_EDGE_PX = 512;

/** Thu nhỏ về cạnh dài 512px, lưu JPEG, để tải nhanh; ảnh nhỏ hơn thì giữ cỡ. */
async function shrinkImage(file: File): Promise<{ blob: Blob; widthPx: number; heightPx: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, AVATAR_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) throw new Error('Không đọc được ảnh');
  return { blob, widthPx: canvas.width, heightPx: canvas.height };
}

/** Avatar ở cột trái trang tài khoản (TF109): bấm để chọn ảnh mới, có nút xoá khi đã có ảnh. */
export function AvatarEditor({ user }: { user: MyProfileDto }) {
  const { session } = useApiSession();
  const input = useRef<HTMLInputElement>(null);
  const [typeError, setTypeError] = useState(false);
  const change = useMutation({
    mutationFn: async (file: File) => {
      const { blob, widthPx, heightPx } = await shrinkImage(file);
      const mediaId = await uploadImage({ body: blob, sizeBytes: blob.size, mimeType: 'image/jpeg', widthPx, heightPx });
      await auth.accountControllerSetAvatar({ mediaId });
      await session.reloadUser();
    },
  });
  const remove = useMutation({
    mutationFn: async () => {
      await auth.accountControllerRemoveAvatar();
      await session.reloadUser();
    },
  });
  const isBusy = change.isPending || remove.isPending;
  const error = typeError ? vi.api.avatarWrongType : change.isError || remove.isError ? vi.api.avatarFailed : null;

  return (
    <div className="profile-avatar-editor">
      <button
        type="button"
        className="profile-avatar is-editable"
        aria-label={vi.api.avatarChange}
        title={vi.api.avatarChange}
        disabled={isBusy}
        aria-busy={isBusy}
        onClick={() => input.current?.click()}
      >
        <span aria-hidden="true">{getInitial(user.displayName)}</span>
        <AvatarPhoto src={user.avatarUrl} />
        <span className="profile-avatar-camera" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          const isImage = resolveImageMimeType(file.type, file.name) !== null;
          setTypeError(!isImage);
          remove.reset();
          if (isImage) change.mutate(file);
        }}
      />
      {isBusy && <output className="auth-hint">{vi.api.avatarUploading}</output>}
      {user.avatarUrl && !isBusy && (
        <button
          type="button"
          className="profile-avatar-remove"
          onClick={() => {
            setTypeError(false);
            change.reset();
            remove.mutate();
          }}
        >
          {vi.api.avatarRemove}
        </button>
      )}
      {error && (
        <p role="alert" className="auth-error">
          {error}
        </p>
      )}
    </div>
  );
}

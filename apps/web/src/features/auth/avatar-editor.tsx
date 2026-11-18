'use client';

import { resolveImageMimeType, uploadImage, useApiSession } from '@tripflix/api-client';
import * as auth from '@tripflix/api-client/core-api/auth/auth';
import type { MyProfileDto } from '@tripflix/api-client/core-api/model/index';
import { useMutation } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { AvatarPhoto } from '@/features/shared/avatar-photo';
import { LoadingDots } from '@/features/shared/loading-dots';
import { useHeaderPopover } from '@/features/shared/use-header-popover';
import { getInitial } from './account-helpers';
import { MAX_ZOOM, clampView, initialView, sourceRect, zoomView, type CropView } from './avatar-crop';

/** Cạnh ảnh sau khi cắt: đủ nét cho avatar 96px trên màn hình mật độ cao. */
const AVATAR_EDGE_PX = 512;
/** Cạnh khung cắt trên màn hình. */
const FRAME_PX = 280;

/**
 * Avatar ở cột trái trang tài khoản (TF109): bấm mở menu Đổi ảnh / Xoá ảnh. Chọn ảnh xong thì mở khung cắt
 * (kéo để chọn vùng, kéo thanh để phóng to); lưu thì cắt ra ảnh vuông 512px rồi mới tải lên.
 */
export function AvatarEditor({ user }: { user: MyProfileDto }) {
  const { session } = useApiSession();
  const { isOpen: isMenuOpen, root: menuRoot, toggle: menuToggle, setOpen: setMenuOpen, close: closeMenu } = useHeaderPopover();
  const input = useRef<HTMLInputElement>(null);
  const [pickedUrl, setPickedUrl] = useState<string | null>(null);
  const [hasTypeError, setTypeError] = useState(false);
  const change = useMutation({
    mutationFn: async (blob: Blob) => {
      const mediaId = await uploadImage({
        body: blob,
        sizeBytes: blob.size,
        mimeType: 'image/jpeg',
        widthPx: AVATAR_EDGE_PX,
        heightPx: AVATAR_EDGE_PX,
      });
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
  const error = hasTypeError ? vi.api.avatarWrongType : change.isError || remove.isError ? vi.api.avatarFailed : null;
  const resetErrors = () => {
    setTypeError(false);
    change.reset();
    remove.reset();
  };

  return (
    <div className="profile-avatar-editor" ref={menuRoot}>
      <button
        ref={menuToggle}
        type="button"
        className="profile-avatar is-editable"
        aria-label={vi.api.avatarChange}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        disabled={isBusy}
        onClick={() => setMenuOpen(!isMenuOpen)}
      >
        <span aria-hidden="true">{getInitial(user.displayName)}</span>
        <AvatarPhoto src={user.avatarUrl} />
        {isBusy ? (
          <span className="profile-avatar-busy">
            <LoadingDots label={vi.api.avatarUploading} />
          </span>
        ) : (
          <span className="profile-avatar-camera" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="15" height="15">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </span>
        )}
      </button>
      {isMenuOpen && (
        <div className="profile-avatar-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeMenu();
              input.current?.click();
            }}
          >
            {vi.api.avatarPick}
          </button>
          {user.avatarUrl && (
            <button
              type="button"
              role="menuitem"
              className="is-danger"
              onClick={() => {
                closeMenu();
                resetErrors();
                remove.mutate();
              }}
            >
              {vi.api.avatarRemove}
            </button>
          )}
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          resetErrors();
          if (resolveImageMimeType(file.type, file.name) === null) {
            setTypeError(true);
            return;
          }
          setPickedUrl(URL.createObjectURL(file));
        }}
      />
      {pickedUrl && (
        <AvatarCropDialog
          src={pickedUrl}
          onClose={() => {
            URL.revokeObjectURL(pickedUrl);
            setPickedUrl(null);
          }}
          onSave={(blob) => change.mutate(blob)}
        />
      )}
      {error && (
        <p role="alert" className="auth-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Hộp cắt ảnh: khung tròn cố định, kéo ảnh để chọn vùng, thanh trượt để phóng to. */
function AvatarCropDialog({ src, onClose, onSave }: { src: string; onClose: () => void; onSave: (blob: Blob) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const drag = useRef<{ pointerX: number; pointerY: number; view: CropView } | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [view, setView] = useState<CropView | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const moveImage = (event: ReactPointerEvent) => {
    if (!drag.current || !imageSize) return;
    const { pointerX, pointerY, view: start } = drag.current;
    const next = { ...start, x: start.x + event.clientX - pointerX, y: start.y + event.clientY - pointerY };
    setView(clampView(next, FRAME_PX, imageSize.width, imageSize.height));
  };

  const saveCrop = () => {
    if (!view || !image.current) return;
    const { sx, sy, size } = sourceRect(view, FRAME_PX);
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_EDGE_PX;
    canvas.height = AVATAR_EDGE_PX;
    canvas.getContext('2d')?.drawImage(image.current, sx, sy, size, size, 0, 0, AVATAR_EDGE_PX, AVATAR_EDGE_PX);
    canvas.toBlob(
      (blob) => {
        if (blob) onSave(blob);
        dialog.current?.close();
      },
      'image/jpeg',
      0.9,
    );
  };

  return (
    <dialog ref={dialog} className="avatar-crop" aria-labelledby="avatar-crop-title" onClose={onClose}>
      <h2 id="avatar-crop-title">{vi.api.avatarCropTitle}</h2>
      <div
        className="avatar-crop-frame"
        style={{ width: FRAME_PX, height: FRAME_PX }}
        onPointerDown={(event) => {
          if (!view) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { pointerX: event.clientX, pointerY: event.clientY, view };
        }}
        onPointerMove={moveImage}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {/* oxlint-disable-next-line nextjs/no-img-element -- ảnh vừa chọn là blob URL, next/image không dùng được */}
        <img
          ref={image}
          src={src}
          alt=""
          draggable={false}
          onLoad={(event) => {
            const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
            setImageSize({ width, height });
            setView(initialView(FRAME_PX, width, height));
          }}
          style={
            view && imageSize
              ? {
                  width: imageSize.width * view.scale,
                  height: imageSize.height * view.scale,
                  transform: `translate(${view.x}px, ${view.y}px)`,
                }
              : { visibility: 'hidden' }
          }
        />
        <span className="avatar-crop-mask" aria-hidden="true" />
      </div>
      <label className="avatar-crop-zoom">
        <span>{vi.api.avatarZoom}</span>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          disabled={!view}
          onChange={(event) => {
            const next = Number(event.target.value);
            setZoom(next);
            if (view && imageSize) setView(zoomView(view, next, FRAME_PX, imageSize.width, imageSize.height));
          }}
        />
      </label>
      <p className="auth-hint">{vi.api.avatarCropHint}</p>
      <div className="avatar-crop-actions">
        <button type="button" className="secondary-button" onClick={() => dialog.current?.close()}>
          {vi.api.cancel}
        </button>
        <button type="button" className="primary-button" disabled={!view} onClick={saveCrop}>
          {vi.api.avatarSave}
        </button>
      </div>
    </dialog>
  );
}

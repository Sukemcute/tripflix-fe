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
import {
  AVATAR_FRAMES,
  AVATAR_STICKER_PRESETS,
  MAX_STICKER_SCALE,
  MIN_STICKER_SCALE,
  clampStickerNorm,
  clampStickerScale,
  createPlacedSticker,
  drawAvatarFrame,
  findStickerPreset,
  type AvatarFrameId,
  type PlacedSticker,
} from './avatar-stickers';

/** Cạnh ảnh sau khi cắt: đủ nét cho avatar 96px trên màn hình mật độ cao. */
const AVATAR_EDGE_PX = 512;
/** Cạnh khung cắt trên màn hình. */
const FRAME_PX = 280;

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không tải được sticker'));
    img.src = src;
  });
}

/**
 * Avatar ở cột trái trang tài khoản (TF109): bấm mở menu Đổi ảnh / Xóa ảnh đồng bộ format.
 * Chọn ảnh xong thì mở hộp chỉnh ảnh căn giữa màn hình, hỗ trợ phóng to và gắn phụ kiện/sticker du lịch.
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
            className="profile-avatar-menu-item"
            onClick={() => {
              closeMenu();
              input.current?.click();
            }}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
              <rect x="3.5" y="5" width="17" height="14" rx="3" />
              <circle cx="9" cy="10" r="1.6" />
              <path d="m6.5 16 4-3.8 3 2.8 2.5-2.2 2.5 3.2" />
            </svg>
            <span>{vi.api.avatarPick}</span>
          </button>
          {user.avatarUrl && (
            <>
              <span className="profile-avatar-menu-divider" role="separator" />
              <button
                type="button"
                role="menuitem"
                className="profile-avatar-menu-item is-danger"
                onClick={() => {
                  closeMenu();
                  resetErrors();
                  remove.mutate();
                }}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
                  <path d="M4.5 7h15" />
                  <path d="M9.5 7V5.2c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7" />
                  <path d="M6.8 7l.8 11.3c.1 1 .9 1.7 1.9 1.7h5c1 0 1.8-.7 1.9-1.7L17.2 7" />
                  <path d="M10 11v5M14 11v5" />
                </svg>
                <span>{vi.api.avatarRemove}</span>
              </button>
            </>
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
          setPickedUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
          });
        }}
      />
      {pickedUrl && (
        <AvatarCropDialog
          src={pickedUrl}
          onPickAnother={() => input.current?.click()}
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

/** Hộp chỉnh ảnh đại diện căn giữa: cắt khung tròn, thu phóng và gắn sticker/phụ kiện du lịch. */
function AvatarCropDialog({
  src,
  onPickAnother,
  onClose,
  onSave,
}: {
  src: string;
  onPickAnother: () => void;
  onClose: () => void;
  onSave: (blob: Blob) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const photoDrag = useRef<{ pointerX: number; pointerY: number; view: CropView } | null>(null);
  const stickerDrag = useRef<{
    pointerX: number;
    pointerY: number;
    instanceId: string;
    startX: number;
    startY: number;
  } | null>(null);
  const nextStickerCounter = useRef(1);

  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [view, setView] = useState<CropView | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState<'stickers' | 'frames'>('stickers');
  const [frameId, setFrameId] = useState<AvatarFrameId>('none');
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (dialog.current && !dialog.current.open) {
      dialog.current.showModal();
    }
  }, []);

  const activeSticker = stickers.find((item) => item.instanceId === activeStickerId) ?? null;

  const applyZoom = (nextZoom: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(1, Number(nextZoom.toFixed(2))));
    setZoom(clamped);
    if (view && imageSize) {
      setView(zoomView(view, clamped, FRAME_PX, imageSize.width, imageSize.height));
    }
  };

  const addSticker = (presetId: string) => {
    const instanceId = `sticker-${nextStickerCounter.current++}`;
    const created = createPlacedSticker(presetId, stickers.length, instanceId);
    setStickers((prev) => [...prev, created]);
    setActiveStickerId(instanceId);
  };

  const updateActiveSticker = (patch: Partial<PlacedSticker>) => {
    if (!activeStickerId) return;
    setStickers((prev) =>
      prev.map((item) => (item.instanceId === activeStickerId ? { ...item, ...patch } : item)),
    );
  };

  const removeActiveSticker = () => {
    if (!activeStickerId) return;
    setStickers((prev) => prev.filter((item) => item.instanceId !== activeStickerId));
    setActiveStickerId(null);
  };

  const moveStagePointer = (event: ReactPointerEvent) => {
    if (stickerDrag.current) {
      const { pointerX, pointerY, instanceId, startX, startY } = stickerDrag.current;
      const nextX = clampStickerNorm(startX + (event.clientX - pointerX) / FRAME_PX);
      const nextY = clampStickerNorm(startY + (event.clientY - pointerY) / FRAME_PX);
      setStickers((prev) =>
        prev.map((item) => (item.instanceId === instanceId ? { ...item, x: nextX, y: nextY } : item)),
      );
      return;
    }
    if (!photoDrag.current || !imageSize) return;
    const { pointerX, pointerY, view: start } = photoDrag.current;
    const next = { ...start, x: start.x + event.clientX - pointerX, y: start.y + event.clientY - pointerY };
    setView(clampView(next, FRAME_PX, imageSize.width, imageSize.height));
  };

  const stopStagePointer = () => {
    photoDrag.current = null;
    stickerDrag.current = null;
    setIsDraggingPhoto(false);
  };

  const saveCrop = async () => {
    if (!view || !image.current || isSaving) return;
    setIsSaving(true);
    try {
      const { sx, sy, size } = sourceRect(view, FRAME_PX);
      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_EDGE_PX;
      canvas.height = AVATAR_EDGE_PX;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(image.current, sx, sy, size, size, 0, 0, AVATAR_EDGE_PX, AVATAR_EDGE_PX);

      const scaleFactor = AVATAR_EDGE_PX / FRAME_PX;
      for (const item of stickers) {
        const preset = findStickerPreset(item.presetId);
        if (!preset) continue;
        try {
          const stickerImg = await loadImageElement(preset.src);
          const drawSize = preset.baseSizePx * item.scale * scaleFactor;
          ctx.save();
          ctx.translate(item.x * AVATAR_EDGE_PX, item.y * AVATAR_EDGE_PX);
          ctx.rotate((item.rotationDeg * Math.PI) / 180);
          ctx.scale(item.isFlipped ? -1 : 1, 1);
          ctx.drawImage(stickerImg, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
          ctx.restore();
        } catch {
          // Bỏ qua nếu một sticker lẻ không tải được để không chặn lưu ảnh.
        }
      }

      drawAvatarFrame(ctx, frameId, AVATAR_EDGE_PX);

      canvas.toBlob(
        (blob) => {
          setIsSaving(false);
          if (blob) onSave(blob);
          dialog.current?.close();
        },
        'image/jpeg',
        0.92,
      );
    } catch {
      setIsSaving(false);
    }
  };

  const countByPreset = (presetId: string) => stickers.filter((item) => item.presetId === presetId).length;

  return (
    <dialog ref={dialog} className="avatar-crop" aria-labelledby="avatar-crop-title" onClose={onClose}>
      <div className="avatar-crop-header">
        <div>
          <h2 id="avatar-crop-title">{vi.api.avatarCropTitle}</h2>
          <p className="avatar-crop-subtitle">{vi.api.avatarCropSubtitle}</p>
        </div>
        <button
          type="button"
          className="avatar-crop-close"
          aria-label={vi.api.cancel}
          onClick={() => dialog.current?.close()}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div className="avatar-crop-stage-wrap">
        <div
          className={`avatar-crop-frame${isDraggingPhoto ? ' is-dragging' : ''}`}
          style={{ width: FRAME_PX, height: FRAME_PX }}
          onPointerDown={(event) => {
            if (!view) return;
            setActiveStickerId(null);
            event.currentTarget.setPointerCapture(event.pointerId);
            photoDrag.current = { pointerX: event.clientX, pointerY: event.clientY, view };
            setIsDraggingPhoto(true);
          }}
          onPointerMove={moveStagePointer}
          onPointerUp={stopStagePointer}
          onPointerCancel={stopStagePointer}
        >
          {/* oxlint-disable-next-line nextjs/no-img-element -- ảnh vừa chọn là blob URL, next/image không dùng được */}
          <img
            ref={image}
            className="avatar-crop-photo"
            src={src}
            alt=""
            draggable={false}
            onLoad={(event) => {
              const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
              setImageSize({ width, height });
              setView(initialView(FRAME_PX, width, height));
              setZoom(1);
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

          {stickers.map((item) => {
            const preset = findStickerPreset(item.presetId);
            if (!preset) return null;
            const sizePx = preset.baseSizePx * item.scale;
            const isSelected = item.instanceId === activeStickerId;
            return (
              <button
                key={item.instanceId}
                type="button"
                aria-label={preset.label}
                className={`avatar-crop-sticker${isSelected ? ' is-selected' : ''}`}
                style={{
                  width: sizePx,
                  height: sizePx,
                  left: item.x * FRAME_PX,
                  top: item.y * FRAME_PX,
                  transform: `translate(-50%, -50%) rotate(${item.rotationDeg}deg) scaleX(${item.isFlipped ? -1 : 1})`,
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  setActiveStickerId(item.instanceId);
                  const frameEl = event.currentTarget.parentElement;
                  if (frameEl) {
                    frameEl.setPointerCapture(event.pointerId);
                  }
                  stickerDrag.current = {
                    pointerX: event.clientX,
                    pointerY: event.clientY,
                    instanceId: item.instanceId,
                    startX: item.x,
                    startY: item.y,
                  };
                }}
              >
                {/* oxlint-disable-next-line nextjs/no-img-element -- sticker là data URL SVG hoặc asset tĩnh gắn trực tiếp lên canvas */}
                <img src={preset.src} alt="" draggable={false} />
              </button>
            );
          })}

          <span className="avatar-crop-grid" aria-hidden="true" />
          <span className="avatar-crop-mask" data-frame={frameId} aria-hidden="true" />
        </div>

        <div className="avatar-crop-zoom-bar">
          <button
            type="button"
            className="avatar-zoom-step"
            aria-label={vi.api.avatarZoomOut}
            disabled={!view || zoom <= 1}
            onClick={() => applyZoom(zoom - 0.25)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
              <path d="M5 12h14" />
            </svg>
          </button>
          <label className="avatar-crop-zoom">
            <span className="sr-only">{vi.api.avatarZoom}</span>
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              disabled={!view}
              onChange={(event) => applyZoom(Number(event.target.value))}
            />
          </label>
          <button
            type="button"
            className="avatar-zoom-step"
            aria-label={vi.api.avatarZoomIn}
            disabled={!view || zoom >= MAX_ZOOM}
            onClick={() => applyZoom(zoom + 0.25)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <span className="avatar-zoom-badge">{Math.round(zoom * 100)}%</span>
          <button type="button" className="avatar-reselect-btn" onClick={onPickAnother}>
            {vi.api.avatarPickAnother}
          </button>
        </div>
      </div>

      {activeSticker && (
        <div className="avatar-sticker-controls">
          <label className="avatar-sticker-scale">
            <span>{vi.api.avatarStickerSize}</span>
            <input
              type="range"
              min={MIN_STICKER_SCALE}
              max={MAX_STICKER_SCALE}
              step={0.05}
              value={activeSticker.scale}
              onChange={(event) =>
                updateActiveSticker({ scale: clampStickerScale(Number(event.target.value)) })
              }
            />
          </label>
          <div className="avatar-sticker-tool-btns">
            <button
              type="button"
              className="avatar-tool-btn"
              title={vi.api.avatarStickerRotateLeft}
              aria-label={vi.api.avatarStickerRotateLeft}
              onClick={() => updateActiveSticker({ rotationDeg: activeSticker.rotationDeg - 15 })}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
                <path d="M4 9V4h5" />
                <path d="M4 9a8 8 0 1 1 2.3 5.7" />
              </svg>
            </button>
            <button
              type="button"
              className="avatar-tool-btn"
              title={vi.api.avatarStickerRotateRight}
              aria-label={vi.api.avatarStickerRotateRight}
              onClick={() => updateActiveSticker({ rotationDeg: activeSticker.rotationDeg + 15 })}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
                <path d="M20 9V4h-5" />
                <path d="M20 9a8 8 0 1 0-2.3 5.7" />
              </svg>
            </button>
            <button
              type="button"
              className={`avatar-tool-btn${activeSticker.isFlipped ? ' is-active' : ''}`}
              title={vi.api.avatarStickerFlip}
              aria-label={vi.api.avatarStickerFlip}
              onClick={() => updateActiveSticker({ isFlipped: !activeSticker.isFlipped })}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
                <path d="M12 4v16" strokeDasharray="2 2" />
                <path d="m8 8-4 4 4 4M16 8l4 4-4 4" />
              </svg>
            </button>
            <button
              type="button"
              className="avatar-tool-btn is-danger"
              title={vi.api.avatarStickerDelete}
              aria-label={vi.api.avatarStickerDelete}
              onClick={removeActiveSticker}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
                <path d="M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="avatar-decor-section">
        <div className="avatar-decor-tabs">
          <div className="avatar-decor-tab-list" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'stickers'}
              className={`avatar-decor-tab${activeTab === 'stickers' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('stickers')}
            >
              {vi.api.avatarTabStickers}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'frames'}
              className={`avatar-decor-tab${activeTab === 'frames' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('frames')}
            >
              {vi.api.avatarTabFrames}
            </button>
          </div>
          {stickers.length > 0 && (
            <button
              type="button"
              className="avatar-decor-clear"
              onClick={() => {
                setStickers([]);
                setActiveStickerId(null);
              }}
            >
              {vi.api.avatarStickerClearAll}
            </button>
          )}
        </div>

        {activeTab === 'stickers' ? (
          <div className="avatar-sticker-tray">
            {AVATAR_STICKER_PRESETS.map((preset) => {
              const count = countByPreset(preset.id);
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`avatar-sticker-chip${count > 0 ? ' is-added' : ''}`}
                  onClick={() => addSticker(preset.id)}
                >
                  <span className="avatar-sticker-chip-thumb">
                    {/* oxlint-disable-next-line nextjs/no-img-element -- thumbnail sticker SVG/PNG trong khay chọn */}
                    <img src={preset.src} alt="" />
                  </span>
                  <span className="avatar-sticker-chip-label">{preset.label}</span>
                  {count > 0 && <span className="avatar-sticker-chip-count">{count}</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="avatar-frame-tray">
            {AVATAR_FRAMES.map((frame) => {
              const isSelected = frame.id === frameId;
              return (
                <button
                  key={frame.id}
                  type="button"
                  className={`avatar-frame-chip${isSelected ? ' is-selected' : ''}`}
                  onClick={() => setFrameId(frame.id)}
                >
                  <span className="avatar-frame-swatch" data-frame={frame.id} />
                  <span>{frame.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="auth-hint avatar-crop-hint">{vi.api.avatarCropHint}</p>

      <div className="avatar-crop-actions">
        <button type="button" className="secondary-button" onClick={() => dialog.current?.close()}>
          {vi.api.cancel}
        </button>
        <button type="button" className="primary-button" disabled={!view || isSaving} onClick={saveCrop}>
          {vi.api.avatarSave}
        </button>
      </div>
    </dialog>
  );
}

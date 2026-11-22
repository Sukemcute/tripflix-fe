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
  fitStickerInStage,
  clampStickerScale,
  createPlacedSticker,
  findFrameOption,
  findStickerPreset,
  clearLegacyAvatarDecor,
  loadUserAvatarDecor,
  snapStickerToOuterRim,
  type AvatarFrameId,
  type PlacedSticker,
  type StoredAvatarDecor,
} from './avatar-stickers';

const isEmptyDecor = (decor: StoredAvatarDecor) => decor.frameId === 'none' && decor.stickers.length === 0;

/** Cạnh ảnh sau khi cắt: đủ nét cho avatar 96px trên màn hình mật độ cao. */
const AVATAR_EDGE_PX = 512;
/** Đường kính khung tròn avatar trong hộp chỉnh (xung quanh còn khoảng đệm để hiện khung & item bọc ngoài). */
const FRAME_PX = 240;

/**
 * Avatar ở cột trái trang tài khoản (TF109): bấm mở menu Chỉnh sửa / Xóa ảnh. Chỉnh sửa mở một hộp chung
 * để cắt, phóng to ảnh, chọn ảnh khác và gắn khung, phụ kiện.
 * Hỗ trợ gắn khung thú bông và phụ kiện bọc tràn ra bên ngoài hình tròn avatar (kiểu Discord Avatar Decorations).
 */
export function AvatarEditor({ user }: { user: MyProfileDto }) {
  const { session } = useApiSession();
  const {
    isOpen: isMenuOpen,
    root: menuRoot,
    toggle: menuToggle,
    setOpen: setMenuOpen,
    close: closeMenu,
  } = useHeaderPopover();
  const input = useRef<HTMLInputElement>(null);
  const [pickedUrl, setPickedUrl] = useState<string | null>(null);
  const [isDecorDialogOpen, setIsDecorDialogOpen] = useState(false);
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
  const saveDecor = useMutation({
    mutationFn: async (decor: StoredAvatarDecor) => {
      if (isEmptyDecor(decor)) await auth.accountControllerRemoveAvatarDecor();
      else await auth.accountControllerSetAvatarDecor(decor);
      await session.reloadUser();
    },
  });
  // Bản trang trí cũ chỉ nằm trong máy (trước khi có API): chuyển lên server một lần để người khác cũng thấy.
  const hasServerDecor = user.avatarDecor !== null;
  const { mutate: migrateDecor } = saveDecor;
  useEffect(() => {
    if (hasServerDecor) return;
    const legacy = loadUserAvatarDecor(user.id);
    if (isEmptyDecor(legacy)) return;
    migrateDecor(legacy, { onSuccess: () => clearLegacyAvatarDecor(user.id) });
  }, [hasServerDecor, user.id, migrateDecor]);
  const isBusy = change.isPending || remove.isPending;
  const error = hasTypeError
    ? vi.api.avatarWrongType
    : change.isError || remove.isError || saveDecor.isError
      ? vi.api.avatarFailed
      : null;
  const resetErrors = () => {
    setTypeError(false);
    change.reset();
    remove.reset();
    saveDecor.reset();
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
              resetErrors();
              setIsDecorDialogOpen(true);
            }}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
              <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
              <path d="m13.5 6.5 4 4" />
            </svg>
            <span>{vi.api.avatarEdit}</span>
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
      {isDecorDialogOpen && (
        <AvatarCropDialog
          user={user}
          pickedSrc={pickedUrl}
          onPickAnother={() => input.current?.click()}
          onClose={() => {
            if (pickedUrl) URL.revokeObjectURL(pickedUrl);
            setPickedUrl(null);
            setIsDecorDialogOpen(false);
          }}
          onSavePhoto={(blob) => change.mutate(blob)}
          onSaveDecor={(decor) => saveDecor.mutate(decor)}
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

/**
 * Hộp chỉnh ảnh đại diện: cắt, phóng to ảnh (ảnh mới chọn hoặc ảnh đang dùng), chọn ảnh khác, gắn khung bọc ngoài
 * và phụ kiện. Phần ảnh nằm ngoài vòng tròn hiện mờ để dễ căn. Chỉ tải ảnh lên lại khi ảnh mới hoặc đã cắt lại.
 */
function AvatarCropDialog({
  user,
  pickedSrc,
  onPickAnother,
  onClose,
  onSavePhoto,
  onSaveDecor,
}: {
  user: MyProfileDto;
  pickedSrc: string | null;
  onPickAnother: () => void;
  onClose: () => void;
  onSavePhoto: (blob: Blob) => void;
  onSaveDecor: (decor: StoredAvatarDecor) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const photoDrag = useRef<{ pointerX: number; pointerY: number; view: CropView } | null>(null);
  const stickerDrag = useRef<{
    pointerX: number;
    pointerY: number;
    instanceId: string;
    startX: number;
    startY: number;
  } | null>(null);
  const nextStickerCounter = useRef(1);

  const initialDecor: StoredAvatarDecor = {
    frameId: (user.avatarDecor?.frameId ?? 'none') as AvatarFrameId,
    stickers: user.avatarDecor?.stickers ?? [],
  };
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [view, setView] = useState<CropView | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isViewChanged, setIsViewChanged] = useState(false);
  // Ảnh đang dùng ở CDN khác gốc: nếu không cho đọc qua CORS thì canvas bị khoá, chỉ chỉnh được khung & phụ kiện.
  const [isCorsBlocked, setIsCorsBlocked] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState<'frames' | 'stickers'>('frames');
  const [frameId, setFrameId] = useState<AvatarFrameId>(initialDecor.frameId);
  const [stickers, setStickers] = useState<PlacedSticker[]>(initialDecor.stickers);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const photoSrc = pickedSrc ?? user.avatarUrl ?? null;
  const isNewPhoto = pickedSrc !== null;
  const canCrop = photoSrc !== null && !(isCorsBlocked && !isNewPhoto);

  useEffect(() => {
    if (dialog.current && !dialog.current.open) {
      dialog.current.showModal();
    }
  }, []);

  const activeSticker = stickers.find((item) => item.instanceId === activeStickerId) ?? null;
  const activeFrameOption = findFrameOption(frameId);

  /** Giữ phụ kiện trong vùng chỉnh, đo theo cỡ thật (trên điện thoại vùng chỉnh nhỏ hơn). */
  const fitSticker = (item: PlacedSticker): PlacedSticker => {
    const preset = findStickerPreset(item.presetId);
    const stagePx = stage.current?.clientWidth ?? FRAME_PX;
    return preset ? fitStickerInStage(item, preset.baseSizePx * item.scale, FRAME_PX, stagePx) : item;
  };

  const applyZoom = (nextZoom: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(1, Number(nextZoom.toFixed(2))));
    setZoom(clamped);
    setIsViewChanged(true);
    if (view && imageSize) {
      setView(zoomView(view, clamped, FRAME_PX, imageSize.width, imageSize.height));
    }
  };

  const addSticker = (presetId: string) => {
    const instanceId = `sticker-${Date.now()}-${nextStickerCounter.current++}`;
    const created = fitSticker(createPlacedSticker(presetId, stickers.length, instanceId));
    setStickers((prev) => [...prev, created]);
    setActiveStickerId(instanceId);
  };

  const updateActiveSticker = (patch: Partial<PlacedSticker>) => {
    if (!activeStickerId) return;
    setStickers((prev) =>
      prev.map((item) => (item.instanceId === activeStickerId ? fitSticker({ ...item, ...patch }) : item)),
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
      const nextX = startX + (event.clientX - pointerX) / FRAME_PX;
      const nextY = startY + (event.clientY - pointerY) / FRAME_PX;
      setStickers((prev) =>
        prev.map((item) =>
          item.instanceId === instanceId ? fitSticker({ ...item, x: nextX, y: nextY }) : item,
        ),
      );
      return;
    }
    if (!photoDrag.current || !imageSize) return;
    const { pointerX, pointerY, view: start } = photoDrag.current;
    const next = { ...start, x: start.x + event.clientX - pointerX, y: start.y + event.clientY - pointerY };
    setView(clampView(next, FRAME_PX, imageSize.width, imageSize.height));
    setIsViewChanged(true);
  };

  const stopStagePointer = () => {
    photoDrag.current = null;
    stickerDrag.current = null;
    setIsDraggingPhoto(false);
  };

  const handleSave = () => {
    if (isSaving) return;
    if (JSON.stringify({ frameId, stickers }) !== JSON.stringify(initialDecor))
      onSaveDecor({ frameId, stickers });

    const shouldUploadPhoto = canCrop && (isNewPhoto || isViewChanged);
    if (!shouldUploadPhoto) {
      dialog.current?.close();
      return;
    }

    if (!view || !image.current) return;
    setIsSaving(true);
    const { sx, sy, size } = sourceRect(view, FRAME_PX);
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_EDGE_PX;
    canvas.height = AVATAR_EDGE_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsSaving(false);
      return;
    }
    ctx.drawImage(image.current, sx, sy, size, size, 0, 0, AVATAR_EDGE_PX, AVATAR_EDGE_PX);
    canvas.toBlob(
      (blob) => {
        setIsSaving(false);
        if (blob) onSavePhoto(blob);
        dialog.current?.close();
      },
      'image/jpeg',
      0.92,
    );
  };

  const countByPreset = (presetId: string) => stickers.filter((item) => item.presetId === presetId).length;

  const photoStyle =
    view && imageSize
      ? {
          width: imageSize.width * view.scale,
          height: imageSize.height * view.scale,
          transform: `translate(${view.x}px, ${view.y}px)`,
        }
      : { visibility: 'hidden' as const };

  return (
    <dialog ref={dialog} className="avatar-crop" aria-labelledby="avatar-crop-title" onClose={onClose}>
      <div className="avatar-crop-header">
        <h2 id="avatar-crop-title">{vi.api.avatarCropTitle}</h2>
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

      <div className="avatar-crop-body">
        <div className="avatar-crop-stage-wrap">
          {/* Vùng chỉnh rộng hơn vòng tròn để khung thú và phụ kiện tràn ra ngoài; phụ kiện không ra khỏi vùng này. */}
          <div
            ref={stage}
            className="avatar-crop-stage-outer"
            onPointerMove={moveStagePointer}
            onPointerUp={stopStagePointer}
            onPointerCancel={stopStagePointer}
          >
            {canCrop && photoSrc && (
              // Ảnh gốc mờ phía sau, trùng vị trí với ảnh trong vòng tròn, để thấy phần đang bị cắt bỏ.
              <div className="avatar-crop-ghost" aria-hidden="true">
                <div style={{ width: FRAME_PX, height: FRAME_PX }}>
                  {/* oxlint-disable-next-line nextjs/no-img-element -- blob URL hoặc ảnh CDN, next/image không dùng được */}
                  <img src={photoSrc} alt="" draggable={false} style={photoStyle} />
                </div>
              </div>
            )}
            <div
              className={`avatar-crop-frame${isDraggingPhoto ? ' is-dragging' : ''}`}
              style={{ width: FRAME_PX, height: FRAME_PX }}
              onPointerDown={(event) => {
                setActiveStickerId(null);
                if (!canCrop || !view) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                photoDrag.current = { pointerX: event.clientX, pointerY: event.clientY, view };
                setIsDraggingPhoto(true);
              }}
            >
              {canCrop && photoSrc ? (
                // oxlint-disable-next-line nextjs/no-img-element -- blob URL hoặc ảnh CDN, next/image không dùng được
                <img
                  key={photoSrc}
                  ref={image}
                  className="avatar-crop-photo"
                  src={photoSrc}
                  alt=""
                  draggable={false}
                  crossOrigin={isNewPhoto ? undefined : 'anonymous'}
                  referrerPolicy="no-referrer"
                  onError={() => {
                    if (!isNewPhoto) setIsCorsBlocked(true);
                  }}
                  onLoad={(event) => {
                    const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
                    setImageSize({ width, height });
                    setView(initialView(FRAME_PX, width, height));
                    setZoom(1);
                    setIsViewChanged(false);
                  }}
                  style={photoStyle}
                />
              ) : (
                <div className="avatar-decor-existing-preview">
                  <span aria-hidden="true">{getInitial(user.displayName)}</span>
                  {photoSrc && (
                    // oxlint-disable-next-line nextjs/no-img-element -- ảnh đại diện hiện tại của người dùng
                    <img className="avatar-photo" src={photoSrc} alt="" referrerPolicy="no-referrer" />
                  )}
                </div>
              )}
              <span className="avatar-crop-grid" aria-hidden="true" />
              <span className="avatar-crop-mask" aria-hidden="true" />
            </div>

            {/* Lớp bọc NGOÀI hình tròn: khung thú và phụ kiện tràn viền */}
            <div className="avatar-crop-outer-layer" style={{ width: FRAME_PX, height: FRAME_PX }}>
              {activeFrameOption?.overlaySrc && (
                // oxlint-disable-next-line nextjs/no-img-element -- khung trang trí bọc bên ngoài hình tròn avatar
                <img
                  className="avatar-outer-deco"
                  src={activeFrameOption.overlaySrc}
                  alt=""
                  aria-hidden="true"
                />
              )}

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
                      stage.current?.setPointerCapture(event.pointerId);
                      stickerDrag.current = {
                        pointerX: event.clientX,
                        pointerY: event.clientY,
                        instanceId: item.instanceId,
                        startX: item.x,
                        startY: item.y,
                      };
                    }}
                  >
                    {/* oxlint-disable-next-line nextjs/no-img-element -- sticker tràn viền ngoài khung tròn */}
                    <img src={preset.src} alt="" draggable={false} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="avatar-crop-zoom-bar">
            {canCrop && (
              <>
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
              </>
            )}
            <button type="button" className="avatar-reselect-btn" onClick={onPickAnother}>
              {vi.api.avatarPickAnother}
            </button>
          </div>
        </div>

        <div className="avatar-crop-side">
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
                  className="avatar-tool-pill"
                  onClick={() => updateActiveSticker(snapStickerToOuterRim(activeSticker))}
                >
                  {vi.api.avatarStickerPlaceOuter}
                </button>
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
                  aria-selected={activeTab === 'frames'}
                  className={`avatar-decor-tab${activeTab === 'frames' ? ' is-active' : ''}`}
                  onClick={() => setActiveTab('frames')}
                >
                  {vi.api.avatarTabFrames}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'stickers'}
                  className={`avatar-decor-tab${activeTab === 'stickers' ? ' is-active' : ''}`}
                  onClick={() => setActiveTab('stickers')}
                >
                  {vi.api.avatarTabStickers}
                </button>
              </div>
              {(stickers.length > 0 || frameId !== 'none') && (
                <button
                  type="button"
                  className="avatar-decor-clear"
                  onClick={() => {
                    setFrameId('none');
                    setStickers([]);
                    setActiveStickerId(null);
                  }}
                >
                  {vi.api.avatarStickerClearAll}
                </button>
              )}
            </div>

            {activeTab === 'frames' ? (
              <div className="avatar-frame-tray">
                {AVATAR_FRAMES.map((frame) => {
                  const isSelected = frame.id === frameId;
                  return (
                    <button
                      key={frame.id}
                      type="button"
                      className={`avatar-frame-card${isSelected ? ' is-selected' : ''}`}
                      onClick={() => setFrameId(frame.id)}
                    >
                      <span className="avatar-frame-card-stage">
                        <span className="avatar-frame-card-circle" />
                        {frame.overlaySrc && (
                          // oxlint-disable-next-line nextjs/no-img-element -- preview khung bọc ngoài vòng tròn
                          <img
                            className="avatar-frame-card-deco"
                            src={frame.overlaySrc}
                            alt=""
                            aria-hidden="true"
                          />
                        )}
                      </span>
                      <span className="avatar-frame-card-label">{frame.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
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
            )}
          </div>

          <div className="avatar-crop-actions">
            <button type="button" className="secondary-button" onClick={() => dialog.current?.close()}>
              {vi.api.cancel}
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={(isNewPhoto && !view) || isSaving}
              onClick={handleSave}
            >
              {vi.api.avatarSave}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

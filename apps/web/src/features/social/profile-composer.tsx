'use client';

import { useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { useState } from 'react';
import { AvatarPhoto } from '@/features/shared/avatar-photo';
import { ComposerModal } from './live-posts';
import feed from './feed/social-feed.module.css';

/** Ô đăng bài ở trang cá nhân của chính mình: cùng giao diện ô đăng bài bên Cảm hứng, mở cùng modal soạn bài. */
export function ProfileComposer({ className }: { className?: string }) {
  const { user } = useApiSession();
  const [isOpen, setIsOpen] = useState(false);
  if (!user) return null;
  const open = () => setIsOpen(true);
  const actions = [
    {
      label: vi.api.composerMediaAction,
      icon: feed.composerTagIconMedia,
      path: (
        <>
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </>
      ),
    },
    {
      label: vi.api.composerAttachTripAction,
      icon: feed.composerTagIconTrip,
      path: (
        <>
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <circle cx="12" cy="10" r="3" />
        </>
      ),
    },
    {
      label: vi.api.composerHashtagAction,
      icon: feed.composerTagIconHash,
      path: (
        <>
          <line x1="4" x2="20" y1="9" y2="9" />
          <line x1="4" x2="20" y1="15" y2="15" />
          <line x1="10" x2="8" y1="3" y2="21" />
          <line x1="16" x2="14" y1="3" y2="21" />
        </>
      ),
    },
  ];
  return (
    <div className={`${feed.composerCard} ${className ?? ''}`}>
      <div className={feed.composerTopRow}>
        <div className={feed.composerAvatar}>
          {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
          <AvatarPhoto src={user.avatarUrl} />
        </div>
        <button type="button" className={feed.composerInputPill} onClick={open}>
          {vi.api.composerPlaceholder}
        </button>
      </div>
      <div className={feed.composerBottomRow}>
        <div className={feed.composerActionGroup}>
          {actions.map((action) => (
            <button key={action.label} type="button" className={feed.composerTagBtn} onClick={open}>
              <span className={action.icon} aria-hidden="true">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {action.path}
                </svg>
              </span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
        <button type="button" className={feed.composerSubmitBtn} onClick={open}>
          {vi.api.composerSubmit}
        </button>
      </div>
      {isOpen && <ComposerModal initialView="compose" initialPostType="vlog" onClose={() => setIsOpen(false)} />}
    </div>
  );
}

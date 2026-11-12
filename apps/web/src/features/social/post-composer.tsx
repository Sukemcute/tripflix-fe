'use client';
import { socialApi } from '@tripflix/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t, vi } from '@tripflix/i18n';
import Link from 'next/link';
import { useState } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';

const TITLE_MAX = 255;
const HASHTAG_MAX = 10;
const HASHTAG_LENGTH_MAX = 30;

/** "#Hội An, phố cổ  amthuc" → ["hội", "an", …]: tách theo dấu phẩy / khoảng trắng, bỏ #, chữ thường, không trùng, tối đa 10. */
export function parseHashtags(value: string): string[] {
  const tags = value
    .split(/[,\s]+/)
    .map((tag) => tag.replace(/^#+/, '').trim().toLowerCase().slice(0, HASHTAG_LENGTH_MAX))
    .filter(Boolean);
  return [...new Set(tags)].slice(0, HASHTAG_MAX);
}

/**
 * Mục "Chia sẻ trải nghiệm" trong trang tài khoản: tạo (rồi sửa tiếp) bản nháp bài chữ.
 * Nhãn "Tiêu đề", "Nội dung", nút "Lưu bản nháp", link "Xem chi tiết" giữ nguyên cho tests/e2e/api-integration.cjs.
 */
export function PostComposer() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [hashtagText, setHashtagText] = useState('');
  const [id, setId] = useState<string>();
  const client = useQueryClient();
  const hashtags = parseHashtags(hashtagText);
  const mutation = useMutation({
    mutationFn: () =>
      id
        ? socialApi.updatePost(id, { title: title.trim(), body, hashtags })
        : socialApi.createDraft({ title: title.trim(), body, hashtags, post_type: 'vlog' }),
    onSuccess: async (post) => {
      setId(post.id);
      await client.invalidateQueries({ queryKey: ['social'] });
    },
  });
  return (
    <section className="profile-card composer" aria-labelledby="composer-title">
      <header className="profile-card-header">
        <div>
          <h2 id="composer-title">{vi.api.create}</h2>
          <p className="auth-hint">{vi.api.composerHint}</p>
        </div>
      </header>
      <p className="profile-note">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
        {vi.api.mediaUnavailable}
      </p>
      <form
        className="composer-form"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="composer-field">
          <div className="composer-label-row">
            <label htmlFor="composer-title-input">{vi.api.title}</label>
            <span className="composer-count">
              {t('api.composerCount', { count: title.length, max: TITLE_MAX })}
            </span>
          </div>
          <input
            id="composer-title-input"
            required
            maxLength={TITLE_MAX}
            placeholder={vi.api.composerTitlePlaceholder}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="composer-field">
          <label htmlFor="composer-body">{vi.api.body}</label>
          <textarea
            id="composer-body"
            rows={8}
            placeholder={vi.api.composerBodyPlaceholder}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>
        <div className="composer-field">
          <label htmlFor="composer-hashtags">{vi.api.hashtags}</label>
          <input
            id="composer-hashtags"
            placeholder={vi.api.composerHashtagsPlaceholder}
            aria-describedby="composer-hashtags-hint"
            value={hashtagText}
            onChange={(event) => setHashtagText(event.target.value)}
          />
          <p className="auth-hint" id="composer-hashtags-hint">
            {vi.api.composerHashtagsHint}
          </p>
          {hashtags.length > 0 && (
            <ul className="post-tags composer-tags" aria-label={vi.api.hashtags}>
              {hashtags.map((tag) => (
                <li key={tag}>#{tag}</li>
              ))}
            </ul>
          )}
        </div>
        <ApiErrorNotice error={mutation.error} />
        {mutation.isSuccess && <output className="auth-success">{vi.api.draftSaved}</output>}
        <div className="composer-actions">
          <button className="primary-button" disabled={mutation.isPending || !title.trim()}>
            {mutation.isPending ? vi.api.saving : vi.api.saveDraft}
          </button>
          {id && (
            <Link prefetch={false} className="secondary-button" href={`/trips/${id}`}>
              {vi.api.detail}
            </Link>
          )}
          <span className="auth-hint">{vi.api.composerDraftNote}</span>
        </div>
      </form>
    </section>
  );
}

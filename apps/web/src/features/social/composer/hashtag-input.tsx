'use client';

import { useState, type KeyboardEvent } from 'react';
import { t, vi } from '@tripflix/i18n';
import { HASHTAG_MAX, appendHashtags } from './composer-inputs';
import styles from './hashtag-input.module.css';

export interface HashtagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  isDisabled?: boolean;
}

/** Ô nhập thẻ: Enter, dấu phẩy hoặc dấu cách thành thẻ; Backspace ở ô trống bỏ thẻ cuối; dán "a, b" thành hai thẻ. */
export function HashtagInput({ tags, onChange, isDisabled = false }: HashtagInputProps) {
  const [draftTag, setDraftTag] = useState('');
  const isFull = tags.length >= HASHTAG_MAX;

  const commitDraft = (value = draftTag) => {
    const next = appendHashtags(tags, value);
    if (next.length !== tags.length) onChange(next);
    setDraftTag('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return; // đang gõ dấu tiếng Việt (IME) thì chưa chốt thẻ
    if (event.key === 'Enter' || event.key === ',' || event.key === ' ') {
      event.preventDefault();
      commitDraft();
    } else if (event.key === 'Backspace' && draftTag === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className={styles.field} data-disabled={isDisabled || undefined}>
      {tags.map((tag) => (
        <span key={tag} className={styles.chip}>
          #{tag}
          <button
            type="button"
            className={styles.remove}
            aria-label={t('api.composerHashtagRemove', { tag })}
            disabled={isDisabled}
            onClick={() => onChange(tags.filter((item) => item !== tag))}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </span>
      ))}
      <input
        className={styles.input}
        aria-label={vi.api.composerHashtagLabel}
        placeholder={isFull ? vi.api.composerHashtagLimit : tags.length === 0 ? vi.api.composerHashtagPlaceholder : ''}
        value={draftTag}
        disabled={isDisabled || isFull}
        onChange={(event) => {
          const value = event.target.value;
          // Dán "a, b c": chốt các phần trước dấu phân cách cuối, giữ phần đang gõ dở.
          const separators = [...value.matchAll(/[,\s]/g)];
          const lastSeparator = separators.at(-1)?.index;
          if (lastSeparator !== undefined) {
            commitDraft(value.slice(0, lastSeparator));
            setDraftTag(value.slice(lastSeparator + 1));
            return;
          }
          setDraftTag(value);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => draftTag.trim() && commitDraft()}
      />
    </div>
  );
}

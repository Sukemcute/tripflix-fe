'use client';
import { socialApi } from '@tripflix/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { SocialIcon } from './live-posts';
import { SEARCH_OPEN_PARAM } from './search-url';
import styles from './post-owner-menu.module.css';

/** Nút "…" của tác giả: sửa tiêu đề/nội dung và xoá bài (chuyển từ trang chi tiết bài cũ). */
export function PostOwnerMenu({
  post,
  buttonClassName,
}: {
  post: { id: string; title: string; body: string };
  buttonClassName?: string;
}) {
  const client = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [isDeleting, setDeleting] = useState(false);
  const saveMutation = useMutation({
    mutationFn: () => socialApi.updatePost(post.id, { title: title.trim(), body }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['social'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: () => socialApi.deletePost(post.id),
    onSuccess: async () => {
      // Bài đang mở từ link thì bỏ khỏi URL, không để trang báo "bài không còn".
      if (searchParams.get(SEARCH_OPEN_PARAM) === post.id) router.replace('/inspiration');
      await client.invalidateQueries({ queryKey: ['social'] });
    },
  });

  return (
    <details className={styles.menu}>
      <summary className={buttonClassName} aria-label={vi.api.postMoreOptions} title={vi.api.postMoreOptions}>
        <SocialIcon name="more" size={18} />
      </summary>
      <div className={styles.panel}>
        <p className={styles.label}>{vi.api.postManage}</p>
        <form
          className="post-editor"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
        >
          <label>
            {vi.api.title}
            <input required value={title} maxLength={255} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            {vi.api.body}
            <textarea value={body} onChange={(event) => setBody(event.target.value)} />
          </label>
          <ApiErrorNotice error={saveMutation.error} />
          {saveMutation.isSuccess && <output className="post-note">{vi.api.saved}</output>}
          <button className="primary-button" disabled={saveMutation.isPending || !title.trim()}>
            {saveMutation.isPending ? vi.api.saving : vi.api.save}
          </button>
        </form>
        <ApiErrorNotice error={deleteMutation.error} />
        <div className="post-manage-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={deleteMutation.isPending}
            onClick={() => (isDeleting ? deleteMutation.mutate() : setDeleting(true))}
          >
            {isDeleting ? vi.api.confirmDelete : vi.api.remove}
          </button>
          {isDeleting && (
            <button type="button" className="secondary-button" onClick={() => setDeleting(false)}>
              {vi.api.cancel}
            </button>
          )}
        </div>
      </div>
    </details>
  );
}

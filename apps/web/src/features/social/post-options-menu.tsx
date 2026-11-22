'use client';
import { evictPostFromCache, socialApi, useApiSession } from '@tripflix/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vi } from '@tripflix/i18n';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { useCloseOnScroll } from '@/features/shared/soft-select';
import { SocialIcon } from './live-posts';
import { ReportContentDialog } from './report-content-dialog';
import { SEARCH_OPEN_PARAM } from './search-url';
import styles from './post-options-menu.module.css';
import { CreatorCommentControls } from './creator-comment-controls';

type Post = { id: string; authorId: string; title: string; body: string };
type Editor = 'content' | 'visibility' | 'delete' | 'comments';

export function PostOptionsMenu({
  post,
  isSaved,
  onToggleSave,
  buttonClassName,
}: {
  post: Post;
  isSaved?: boolean;
  onToggleSave?: () => void;
  buttonClassName?: string;
}) {
  const { user } = useApiSession();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const popup = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const isMine = !!user && post.authorId === user.id;
  const detail = useQuery({
    queryKey: ['social', 'post', post.id, user?.id],
    enabled: open && !onToggleSave,
    queryFn: ({ signal }) => socialApi.getPost(post.id, signal),
    staleTime: 0,
  });
  const client = useQueryClient();
  const saved = onToggleSave ? !!isSaved : !!detail.data?.viewerContext.isBookmarked;
  const save = useMutation({
    mutationFn: () => socialApi.setBookmark(post.id, !saved),
    onSuccess: async () => {
      popup.current?.hidePopover();
      await Promise.all([
        client.invalidateQueries({ queryKey: ['social'] }),
        client.invalidateQueries({ queryKey: ['feed'] }),
      ]);
    },
  });
  useCloseOnScroll(open, popup);
  const close = () => popup.current?.hidePopover();
  const restoreFocus = () => trigger.current?.focus();
  // Popover "auto" tự đóng ngay khi nhấn chuột xuống nút, nên phải nhớ trạng thái lúc nhấn để click đó chỉ đóng menu.
  const wasOpenOnPress = useRef(false);
  const toggle = () => {
    const panel = popup.current;
    const button = trigger.current;
    const wasOpen = wasOpenOnPress.current;
    wasOpenOnPress.current = false;
    if (!panel || !button) return;
    if (wasOpen || panel.matches(':popover-open')) {
      close();
      return;
    }
    panel.showPopover();
    const rect = button.getBoundingClientRect();
    panel.style.left = `${Math.max(12, Math.min(rect.right - panel.offsetWidth, innerWidth - panel.offsetWidth - 12))}px`;
    panel.style.top = `${Math.max(12, Math.min(rect.bottom + 8, innerHeight - panel.offsetHeight - 12))}px`;
    panel.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
  };
  const edit = (view: Editor) => {
    close();
    setEditor(view);
  };
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={buttonClassName}
        aria-label={vi.api.postMoreOptions}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onPointerDown={() => {
          wasOpenOnPress.current = !!popup.current?.matches(':popover-open');
        }}
        onClick={toggle}
      >
        <SocialIcon name="more" size={18} />
      </button>
      <div
        ref={popup}
        id={id}
        popover="auto"
        role="menu"
        tabIndex={-1}
        aria-label={vi.api.postMoreOptions}
        className={styles.menu}
        onToggle={(event) => setOpen(event.newState === 'open')}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            close();
            restoreFocus();
            return;
          }
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const items = [
            ...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'),
          ];
          const index = items.indexOf(document.activeElement as HTMLButtonElement);
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? items.length - 1
                : (index + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
          items[next]?.focus();
        }}
      >
        <MenuItem
          icon={<SocialIcon name={saved ? 'bookmarkFilled' : 'bookmark'} size={22} />}
          title={saved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
          hint={saved ? 'Xóa khỏi mục Đã lưu' : 'Thêm vào mục Đã lưu'}
          disabled={save.isPending || (!onToggleSave && !detail.data)}
          onClick={() => {
            if (onToggleSave) {
              close();
              onToggleSave();
            } else {
              save.mutate();
            }
          }}
        />
        {isMine ? (
          <>
            <hr />
            <MenuItem
              icon={<SocialIcon name="comment" size={22} />}
              title={vi.moderation.creatorSettings}
              onClick={() => edit('comments')}
            />
            <MenuItem
              icon={<OptionIcon name="edit" />}
              title="Chỉnh sửa bài viết"
              onClick={() => edit('content')}
            />
            <MenuItem
              icon={<SocialIcon name="users" size={22} />}
              title="Chỉnh sửa quyền xem"
              hint="Công khai hoặc chỉ mình tôi"
              onClick={() => edit('visibility')}
            />
            <hr />
            <MenuItem
              icon={<SocialIcon name="trash" size={22} />}
              title="Xóa bài viết"
              hint="Bài viết sẽ không còn hiển thị"
              danger
              onClick={() => edit('delete')}
            />
          </>
        ) : (
          <>
            <hr />
            <MenuItem
              icon={<OptionIcon name="flag" />}
              title={reported ? 'Đã báo cáo bài viết' : 'Báo cáo bài viết'}
              hint="Gửi cho đội ngũ kiểm duyệt"
              disabled={reported}
              onClick={() => {
                close();
                if (!user) {
                  router.push(
                    `/login?returnTo=${encodeURIComponent(pathname + (search.size ? `?${search}` : ''))}`,
                  );
                  return;
                }
                setReportOpen(true);
              }}
            />
          </>
        )}
        <ApiErrorNotice
          error={save.error ?? (!onToggleSave ? detail.error : null)}
          retry={() => void detail.refetch()}
        />
      </div>
      {editor && isMine && (
        <PostEditorDialog
          key={`${post.id}-${editor}`}
          post={post}
          view={editor}
          onClose={() => {
            setEditor(null);
            restoreFocus();
          }}
        />
      )}
      {reportOpen && (
        <ReportContentDialog
          targetType="post"
          targetId={post.id}
          onClose={() => {
            setReportOpen(false);
            restoreFocus();
          }}
          onReported={() => setReported(true)}
        />
      )}
    </>
  );
}

function MenuItem({
  icon,
  title,
  hint,
  danger,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`${styles.item} ${danger ? styles.danger : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className={styles.icon}>{icon}</span>
      <span>
        <span className={styles.title}>{title}</span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
    </button>
  );
}

function OptionIcon({ name }: { name: 'edit' | 'flag' }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'edit' ? (
        <path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-4L4 15v5Z" />
      ) : (
        <path d="M5 21V4m0 0c5-4 9 4 14 0v11c-5 4-9-4-14 0" />
      )}
    </svg>
  );
}

function PostEditorDialog({ post, view, onClose }: { post: Post; view: Editor; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { user } = useApiSession();
  const title =
    view === 'comments'
      ? vi.moderation.creatorSettings
      : view === 'content'
        ? 'Chỉnh sửa bài viết'
        : view === 'visibility'
          ? 'Chỉnh sửa quyền xem'
          : 'Xóa bài viết?';
  const id = useId();
  const detail = useQuery({
    queryKey: ['social', 'post', post.id, user?.id],
    queryFn: ({ signal }) => socialApi.getPost(post.id, signal),
    staleTime: 0,
    enabled: view === 'content' || view === 'visibility',
  });
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={id} onClose={onClose}>
      <header className={styles.header}>
        <h2 id={id}>{title}</h2>
        <button
          type="button"
          className={styles.close}
          aria-label="Đóng"
          onClick={() => dialog.current?.close()}
        >
          <SocialIcon name="close" size={20} />
        </button>
      </header>
      <div className={styles.content}>
        <ApiErrorNotice error={detail.error} retry={() => void detail.refetch()} />
        {view === 'comments' ? (
          <CreatorCommentControls postId={post.id} initialOpen />
        ) : (
          <>
            {view !== 'delete' && !detail.data && detail.isFetching && <output>{vi.api.loading}</output>}
            {(view === 'delete' || detail.data) && (
              <EditorForm
                post={detail.data?.post ?? post}
                view={view}
                onClose={() => dialog.current?.close()}
              />
            )}
          </>
        )}
      </div>
    </dialog>
  );
}

function EditorForm({
  post,
  view,
  onClose,
}: {
  post: Post & { visibility?: string };
  view: Exclude<Editor, 'comments'>;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const router = useRouter();
  const search = useSearchParams();
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const formId = useId();
  const [visibility, setVisibility] = useState<'public' | 'private'>(
    post.visibility === 'private' ? 'private' : 'public',
  );
  const mutation = useMutation({
    mutationFn: async () => {
      if (view === 'delete') {
        await socialApi.deletePost(post.id);
      } else {
        await socialApi.updatePost(
          post.id,
          view === 'visibility' ? { visibility } : { title: title.trim(), body },
        );
      }
    },
    onSuccess: async () => {
      if (view === 'delete' || (view === 'visibility' && visibility === 'private'))
        evictPostFromCache(client, post.id);
      onClose();
      if (view === 'delete' && search.get(SEARCH_OPEN_PARAM) === post.id) router.replace('/inspiration');
      await Promise.all([
        client.invalidateQueries({ queryKey: ['social'] }),
        client.invalidateQueries({ queryKey: ['feed'] }),
      ]);
    },
  });
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (!mutation.isPending) mutation.mutate();
      }}
    >
      <fieldset disabled={mutation.isPending}>
        {view === 'content' && (
          <>
            <div className={styles.field}>
              <label htmlFor={`${formId}-title`}>{vi.api.title}</label>
              <input
                id={`${formId}-title`}
                required
                maxLength={255}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`${formId}-body`}>{vi.api.body}</label>
              <textarea
                id={`${formId}-body`}
                rows={5}
                value={body}
                maxLength={10000}
                onChange={(event) => setBody(event.target.value)}
              />
            </div>
          </>
        )}
        {view === 'visibility' && (
          <>
            <legend>Ai có thể xem bài viết này?</legend>
            <label className={styles.choice}>
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
              />
              <span>
                Công khai<span className={styles.hint}>Mọi người có thể xem bài viết</span>
              </span>
            </label>
            <label className={styles.choice}>
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === 'private'}
                onChange={() => setVisibility('private')}
              />
              <span>
                Chỉ mình tôi<span className={styles.hint}>Chỉ bạn có thể xem bài viết</span>
              </span>
            </label>
          </>
        )}
        {view === 'delete' && (
          <p>Bạn muốn xóa “{post.title}”? Bài viết sẽ không còn hiển thị với người khác.</p>
        )}
      </fieldset>
      <ApiErrorNotice error={mutation.error} />
      <footer className={styles.actions}>
        <button type="button" className="secondary-button" onClick={onClose} disabled={mutation.isPending}>
          Hủy
        </button>
        <button
          type="submit"
          className={view === 'delete' ? styles.delete : 'primary-button'}
          disabled={mutation.isPending || (view === 'content' && !title.trim())}
        >
          {mutation.isPending ? vi.api.saving : view === 'delete' ? 'Xóa bài viết' : vi.api.save}
        </button>
      </footer>
    </form>
  );
}

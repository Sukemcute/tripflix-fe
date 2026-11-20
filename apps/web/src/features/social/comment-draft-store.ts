import type { CommentMention, MentionQuery } from './mention-input';

export interface CommentDraft {
  body: string;
  replyTarget: { id: string; authorName: string } | null;
  mentions?: CommentMention[];
}

const STORAGE_KEY = 'tripflix.comment_drafts';
export const COMMENT_DRAFT_SAVE_DELAY_MS = 400;

export function sameMentionQuery(a: MentionQuery | null, b: MentionQuery | null): boolean {
  return a === b || (a !== null && b !== null && a.query === b.query && a.atIndex === b.atIndex);
}

export function isMentionNavigationKey(key: string): boolean {
  return ['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(key);
}

export function createCommentDraftStore(getStorage: () => Storage | null) {
  let drafts: Record<string, CommentDraft> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let isDirty = false;
  const read = () => {
    if (drafts) return drafts;
    try {
      const raw = getStorage()?.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      drafts = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, CommentDraft> : {};
    } catch {
      drafts = {};
    }
    return drafts;
  };
  const flush = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (!isDirty) return;
    try {
      const storage = getStorage();
      if (!storage) return;
      storage.setItem(STORAGE_KEY, JSON.stringify(read()));
      isDirty = false;
    } catch {
      // Storage có thể bị trình duyệt từ chối; giữ nháp trong bộ nhớ.
    }
  };
  const save = (key: string, draft: CommentDraft | null) => {
    const map = read();
    const hasDraft = Boolean(draft && (draft.body.trim() || draft.replyTarget || draft.mentions?.length));
    if (!hasDraft && !(key in map)) return;
    if (hasDraft && draft) map[key] = draft;
    else delete map[key];
    isDirty = true;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(flush, COMMENT_DRAFT_SAVE_DELAY_MS);
  };
  return { get: (key: string) => read()[key], save, flush };
}

export const commentDraftStore = createCommentDraftStore(() =>
  typeof window === 'undefined' ? null : window.sessionStorage,
);

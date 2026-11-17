import { HttpError, socialApi, uploadVideo, type VideoUploadState } from '@tripflix/api-client';
import type { QueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import type { VideoCompression } from './video-compress';
import type { PickedVideo } from './video-source';

/**
 * Đăng bài chạy nền (giống TikTok): bấm Đăng thì về màn chính, việc nén, tải video, tạo và đăng bài chạy tiếp ở đây.
 * Thẻ tiến độ ở "Bài đăng của tôi" đọc trạng thái này; lỗi thì giữ nguyên dữ liệu để bấm thử lại.
 */
export type PostDraftInput = Parameters<typeof socialApi.updatePost>[1] & { title: string; body: string };

export interface PostUploadJob {
  id: number;
  title: string;
  phase: 'compressing' | 'uploading' | 'publishing' | 'done' | 'failed';
  /** 0–100 của cả quá trình. */
  percent: number;
  postId?: string;
}

interface JobInput {
  postId?: string;
  draft: PostDraftInput;
  video: PickedVideo | null;
  compression: VideoCompression | null;
  uploadedAssetId: string | null;
  client: QueryClient;
  /** Lượt tải dở lần trước: Thử lại thì gửi tiếp các phần còn thiếu thay vì tải lại từ đầu. */
  uploadState?: VideoUploadState;
}

let current: PostUploadJob | null = null;
let input: JobInput | null = null;
let seq = 0;
/** Huỷ lượt tải đang chạy khi bắt đầu bài mới, để video cũ không tiếp tục chiếm mạng và để lại file rác. */
let abortRun: AbortController | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function update(patch: Partial<PostUploadJob>) {
  if (!current) return;
  current = { ...current, ...patch };
  notify();
}

async function run(id: number) {
  const job = input!;
  const isCurrent = () => current?.id === id;
  abortRun?.abort();
  const controller = new AbortController();
  abortRun = controller;
  const resume = job.uploadState;
  let hasNewPart = false;
  try {
    let assetId = job.uploadedAssetId ?? undefined;
    if (job.video && !assetId) {
      let source = job.video;
      if (job.compression?.compressing) {
        update({ phase: 'compressing' });
        source = await job.compression.result;
      }
      if (!isCurrent()) return;
      update({ phase: 'uploading', percent: 10 });
      // Tải video chiếm phần lớn thanh tiến độ (10% → 90%).
      assetId = await uploadVideo(source, {
        signal: controller.signal,
        resume,
        onState: (state) => {
          hasNewPart ||= state.uploaded.length > (resume?.uploaded.length ?? 0);
          job.uploadState = state;
        },
        onProgress: (done, total) => {
          if (isCurrent()) update({ percent: 10 + Math.floor((done / total) * 80) });
        },
      });
      job.uploadedAssetId = assetId;
      job.uploadState = undefined;
      job.compression?.dispose();
    }
    if (!isCurrent()) return;
    update({ phase: 'publishing', percent: 92 });
    const draft = { ...job.draft, ...(assetId ? { media_ids: [assetId] } : {}) };
    const saved = await (job.postId
      ? socialApi.updatePost(job.postId, draft)
      : socialApi.createDraft({ ...draft, post_type: assetId ? 'video' : 'vlog' }));
    job.postId = saved.id;
    if (saved.status === 'draft') await socialApi.publishPost(saved.id);
    if (!isCurrent()) return;
    update({ phase: 'done', percent: 100, postId: saved.id });
    // Làm mới danh sách bài và lưới reel trên trang cá nhân.
    await Promise.all([
      job.client.invalidateQueries({ queryKey: ['social'] }),
      job.client.invalidateQueries({ queryKey: ['feed', 'authorPages'] }),
    ]);
  } catch (error) {
    // Server không nhận lượt tải cũ nữa (hết hạn, đã huỷ) thì lần sau tải lại từ đầu; lỗi mạng thì vẫn tải tiếp.
    if (resume && !hasNewPart && error instanceof HttpError && error.status >= 400 && error.status < 500)
      job.uploadState = undefined;
    if (isCurrent()) update({ phase: 'failed' });
  } finally {
    if (abortRun === controller) abortRun = null;
  }
}

export function startPostUpload(title: string, next: JobInput): void {
  // Bài trước còn dở thì bỏ file nén tạm của nó; mỗi lần chỉ chạy một bài.
  if (input && input !== next && current?.phase !== 'done') input.compression?.dispose();
  seq += 1;
  input = next;
  current = { id: seq, title, phase: 'compressing', percent: 0 };
  notify();
  void run(seq);
}

export function retryPostUpload(): void {
  if (!current || current.phase !== 'failed' || !input) return;
  current = { ...current, phase: 'compressing', percent: 0 };
  notify();
  void run(current.id);
}

export function dismissPostUpload(): void {
  if (current?.phase !== 'done' && current?.phase !== 'failed') return;
  if (current.phase === 'failed') input?.compression?.dispose();
  current = null;
  input = null;
  notify();
}

export function usePostUpload(): PostUploadJob | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
}

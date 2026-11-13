'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { ApiErrorNotice } from '@/features/shared/api-state';

const actions: Record<string, string> = {
  hide: 'Đã ẩn',
  auto_hide: 'Tạm ẩn để kiểm tra',
  remove: 'Đã gỡ',
  restore: 'Đã khôi phục',
  dismiss: 'Đã đóng hồ sơ',
};
const statuses: Record<string, string> = {
  pending: 'Đang xem xét',
  upheld: 'Giữ nguyên quyết định',
  overturned: 'Đã chấp nhận',
};

export function ModerationStatus() {
  const { user } = useApiSession();
  const client = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const query = useInfiniteQuery({
    queryKey: ['my-moderation', user?.id],
    enabled: Boolean(user),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => moderationApi.myDecisions(pageParam, signal),
    getNextPageParam: (page) => (page.nextCursor ? Number(page.nextCursor) : undefined),
  });
  const reports = useInfiniteQuery({
    queryKey: ['my-reports', user?.id],
    enabled: Boolean(user),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => moderationApi.myReports(pageParam, signal),
    getNextPageParam: (page) => (page.nextCursor ? Number(page.nextCursor) : undefined),
  });
  const submit = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => moderationApi.submitAppeal(id, text),
    onSuccess: async () => {
      setSelected(null);
      setReason('');
      await client.invalidateQueries({ queryKey: ['my-moderation'] });
    },
  });
  if (!user)
    return (
      <main>
        <h1>Trạng thái kiểm duyệt</h1>
        <Link href="/login?returnTo=%2Faccount%2Fmoderation">Đăng nhập để xem</Link>
      </main>
    );
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
      <h1>Trạng thái kiểm duyệt</h1>
      <p>
        Xem quyết định đối với nội dung của bạn. Bạn có thể khiếu nại quyết định còn hiệu lực trong 30 ngày.
      </p>
      {query.isPending && <p>Đang tải…</p>}
      <ApiErrorNotice error={query.error} />
      {!query.isPending && !query.error && !items.length && <p>Bạn chưa có quyết định kiểm duyệt.</p>}
      {items.map((item) => (
        <article key={item.id} style={{ padding: '20px 0', borderBottom: '1px solid #ddd' }}>
          <h2>
            {item.targetType === 'post' ? 'Bài viết' : 'Bình luận'} · {actions[item.action] ?? item.action}
          </h2>
          {item.targetPreview && <p>Nội dung: {item.targetPreview}</p>}
          <p>
            Lý do:{' '}
            {vi.moderation.reasons[item.reasonCode as keyof typeof vi.moderation.reasons] ?? 'Lý do khác'} ·{' '}
            {new Date(item.createdAt).toLocaleString('vi-VN')}
          </p>
          {item.appealStatus && <p>Khiếu nại: {statuses[item.appealStatus]}</p>}
          {!item.canAppeal && !item.appealStatus && ['hide', 'auto_hide', 'remove'].includes(item.action) && (
            <p>Quyết định này không còn đủ điều kiện gửi khiếu nại trực tuyến.</p>
          )}
          {item.canAppeal && selected !== item.id && (
            <button
              type="button"
              onClick={() => {
                setSelected(item.id);
                setReason('');
                submit.reset();
              }}
            >
              Gửi khiếu nại
            </button>
          )}
          {selected === item.id && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submit.mutate({ id: item.id, text: reason.trim() });
              }}
            >
              <label htmlFor={`appeal-${item.id}`}>Lý do khiếu nại</label>
              <textarea
                id={`appeal-${item.id}`}
                value={reason}
                maxLength={1000}
                required
                onChange={(event) => setReason(event.target.value)}
              />
              <ApiErrorNotice error={submit.error} />
              <button type="submit" disabled={submit.isPending || !reason.trim()}>
                Gửi
              </button>{' '}
              <button type="button" onClick={() => setSelected(null)}>
                Hủy
              </button>
            </form>
          )}
        </article>
      ))}
      {query.hasNextPage && (
        <button type="button" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          Xem thêm
        </button>
      )}
      <h2>Báo cáo của tôi</h2>
      {reports.isPending && <p>Đang tải báo cáo…</p>}
      <ApiErrorNotice error={reports.error} />
      {!reports.isPending && !reports.error && !reports.data?.pages[0]?.items.length && (
        <p>Bạn chưa gửi báo cáo.</p>
      )}
      {reports.data?.pages
        .flatMap((page) => page.items)
        .map((report) => (
          <article key={report.id} style={{ padding: '12px 0' }}>
            <p>
              {report.targetType === 'post' ? 'Bài viết' : 'Bình luận'} ·{' '}
              {vi.moderation.reasons[report.reasonCode as keyof typeof vi.moderation.reasons] ?? 'Lý do khác'}
            </p>
            <p>
              {report.caseStatus === 'resolved'
                ? 'Đã có kết quả xử lý'
                : report.caseStatus === 'pending'
                  ? 'Đang xem xét'
                  : 'Đã tiếp nhận'}{' '}
              · {new Date(report.createdAt).toLocaleString('vi-VN')}
            </p>
          </article>
        ))}
      {reports.hasNextPage && (
        <button
          type="button"
          disabled={reports.isFetchingNextPage}
          onClick={() => void reports.fetchNextPage()}
        >
          Xem thêm báo cáo
        </button>
      )}
    </main>
  );
}

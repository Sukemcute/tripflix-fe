import { useState } from 'react';
import { View } from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi, useApiSession } from '@tripflix/api-client';
import { vi } from '@tripflix/i18n';
import { ApiErrorNotice, RequireAccount } from '@/components/api-state';
import { Button, Card, Field, Screen, Txt } from '@/components/mobile-ui';

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

export function ModerationStatusScreen() {
  const { user, isReady } = useApiSession();
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
  if (!isReady || !user) return <RequireAccount />;
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <Screen title="Trạng thái kiểm duyệt">
      <Txt>Bạn có thể khiếu nại quyết định còn hiệu lực trong 30 ngày.</Txt>
      {query.isPending && <Txt>Đang tải…</Txt>}
      <ApiErrorNotice error={query.error} />
      {!query.isPending && !query.error && !items.length && <Txt>Bạn chưa có quyết định kiểm duyệt.</Txt>}
      {items.map((item) => (
        <Card key={item.id}>
          <View style={{ gap: 10 }}>
            <Txt>
              {item.targetType === 'post' ? 'Bài viết' : 'Bình luận'} · {actions[item.action] ?? item.action}
            </Txt>
            {item.targetPreview && <Txt>Nội dung: {item.targetPreview}</Txt>}
            <Txt>
              Lý do:{' '}
              {vi.moderation.reasons[item.reasonCode as keyof typeof vi.moderation.reasons] ?? 'Lý do khác'}
            </Txt>
            <Txt>{new Date(item.createdAt).toLocaleString('vi-VN')}</Txt>
            {item.appealStatus && <Txt>Khiếu nại: {statuses[item.appealStatus]}</Txt>}
            {!item.canAppeal &&
              !item.appealStatus &&
              ['hide', 'auto_hide', 'remove'].includes(item.action) && (
                <Txt>Quyết định này không còn đủ điều kiện gửi khiếu nại trực tuyến.</Txt>
              )}
            {item.canAppeal && selected !== item.id && (
              <Button
                onPress={() => {
                  setSelected(item.id);
                  setReason('');
                  submit.reset();
                }}
              >
                Gửi khiếu nại
              </Button>
            )}
            {selected === item.id && (
              <View style={{ gap: 10 }}>
                <Field
                  label="Lý do khiếu nại"
                  value={reason}
                  onChangeText={setReason}
                  maxLength={1000}
                  multiline
                />
                <ApiErrorNotice error={submit.error} />
                <Button
                  disabled={submit.isPending || !reason.trim()}
                  onPress={() => submit.mutate({ id: item.id, text: reason.trim() })}
                >
                  Gửi
                </Button>
                <Button tone="secondary" onPress={() => setSelected(null)}>
                  Hủy
                </Button>
              </View>
            )}
          </View>
        </Card>
      ))}
      {query.hasNextPage && (
        <Button disabled={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()}>
          Xem thêm
        </Button>
      )}
      <Txt>Báo cáo của tôi</Txt>
      {reports.isPending && <Txt>Đang tải báo cáo…</Txt>}
      <ApiErrorNotice error={reports.error} />
      {!reports.isPending && !reports.error && !reports.data?.pages[0]?.items.length && (
        <Txt>Bạn chưa gửi báo cáo.</Txt>
      )}
      {reports.data?.pages
        .flatMap((page) => page.items)
        .map((report) => (
          <Card key={report.id}>
            <Txt>
              {report.targetType === 'post' ? 'Bài viết' : 'Bình luận'} ·{' '}
              {vi.moderation.reasons[report.reasonCode as keyof typeof vi.moderation.reasons] ?? 'Lý do khác'}
            </Txt>
            <Txt>
              {report.caseStatus === 'resolved'
                ? 'Đã có kết quả xử lý'
                : report.caseStatus === 'pending'
                  ? 'Đang xem xét'
                  : 'Đã tiếp nhận'}
            </Txt>
          </Card>
        ))}
      {reports.hasNextPage && (
        <Button disabled={reports.isFetchingNextPage} onPress={() => void reports.fetchNextPage()}>
          Xem thêm báo cáo
        </Button>
      )}
    </Screen>
  );
}

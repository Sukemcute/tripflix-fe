'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { moderationApi, socialApi } from '@tripflix/api-client';
import type { DecisionDto, ModerationCaseDto } from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { useState, type ReactNode } from 'react';
import { AdminApiError } from '../shell/api-state';
import { formatDateTime, shortId } from '../ui/format';
import { Icon } from '../ui/icon';
import { Badge, Button, Drawer, Segmented, Skeleton, controlClass, fieldLabelClass } from '../ui/primitives';
import { CaseContextTags, RiskTags, SeverityMeter } from './case-context-tags';
import { LogTable } from './moderation-log';
import { getContentWarning, getRiskLevel } from './risk-level';

const text = vi.moderation;
const reasonKeys = Object.keys(text.reasons) as (keyof typeof text.reasons)[];

/** Hồ sơ chờ thì ra quyết định trên hồ sơ; đã đóng thì thao tác thẳng lên bình luận hoặc bài. */
export async function applyDecision(item: ModerationCaseDto, body: DecisionDto): Promise<void> {
  if (item.status === 'pending') {
    await moderationApi.decide(item.id, body);
  } else if (item.targetType === 'comment') {
    await moderationApi.commentAction(item.targetId, body);
  } else if (body.action !== 'dismiss') {
    await socialApi.moderatePost(item.targetId, {
      action: body.action,
      reason_code: body.reasonCode,
      reason_detail: body.reasonDetail,
    });
  } else {
    throw new Error('Hồ sơ đã được duyệt');
  }
}

export function CaseDetailDrawer({
  id,
  onClose,
  onDecision,
}: {
  id: string | null;
  onClose: () => void;
  onDecision: (action: DecisionDto['action']) => void;
}) {
  return (
    <Drawer isOpen={!!id} onClose={onClose} title="Chi tiết nội dung kiểm duyệt" closeLabel="Đóng modal" wide>
      {id && <CaseDetail key={id} id={id} onClose={onClose} onDecision={onDecision} />}
    </Drawer>
  );
}

function CaseDetail({
  id,
  onClose,
  onDecision,
}: {
  id: string;
  onClose: () => void;
  onDecision: (action: DecisionDto['action']) => void;
}) {
  const client = useQueryClient();
  const [tab, setTab] = useState<'info' | 'reports' | 'history'>('info');
  const [reasonCode, setReasonCode] = useState<DecisionDto['reasonCode'] | ''>('SPAM_OR_COMMERCIAL');
  const [notes, setNotes] = useState('');
  const detail = useQuery({
    queryKey: ['moderation', 'detail', id],
    queryFn: ({ signal }) => moderationApi.detail(id, signal),
  });
  const decision = useMutation({
    mutationFn: (action: DecisionDto['action']) => {
      if (!reasonCode || !detail.data) throw new Error(text.chooseReason);
      return applyDecision(detail.data, { action, reasonCode, reasonDetail: notes.trim() || undefined });
    },
    onSuccess: async (_, action) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['moderation'] }),
        client.invalidateQueries({ queryKey: ['social'] }),
      ]);
      onClose();
      if (action !== 'dismiss' || detail.data?.target?.status !== 'hidden') onDecision(action);
    },
  });
  const item = detail.data;
  const status = item?.target?.status;
  const recordedReasons =
    item &&
    [
      ...new Set([
        typeof item.flags.reasonCode === 'string' ? item.flags.reasonCode : null,
        ...item.reports.map((report) => report.reasonCode),
      ]),
    ]
      .flatMap((code) => (code && code in text.reasons ? [text.reasons[code as keyof typeof text.reasons]] : []))
      .join(', ');

  if (detail.isPending)
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-48" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-24" />
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <AdminApiError error={detail.error} retry={() => void detail.refetch()} />
      {item && (
        <>
          <Segmented
            ariaLabel="Phần của hồ sơ"
            value={tab}
            onChange={setTab}
            items={[
              { id: 'info', label: 'Thông tin' },
              { id: 'reports', label: `Báo cáo (${item.reports.length})` },
              { id: 'history', label: 'Lịch sử xử lý' },
            ]}
          />

          {tab === 'info' && (
            <>
              <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
                <figure className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-xl bg-surface-muted text-text-subtle md:aspect-auto md:min-h-48">
                  {item.target?.coverUrl ? (
                    // Ảnh bìa đến từ CDN media với URL ký tạm; next/image cần khai báo domain nên dùng img.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.target.coverUrl} alt={vi.adminConsole.moderation.coverAlt} className="size-full object-cover" />
                  ) : (
                    <figcaption className="flex flex-col items-center gap-1 text-xs">
                      <Icon name={item.targetType === 'comment' ? 'comment' : 'image'} size={24} />
                      {vi.adminConsole.moderation.noCover}
                    </figcaption>
                  )}
                </figure>
                <div className="flex min-w-0 flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="navy">{item.targetType === 'comment' ? 'Bình luận' : 'Bài viết'}</Badge>
                    <SeverityMeter severity={item.severity} isWarning={!!getContentWarning(item.flags)} />
                    <span className="text-xs text-text-muted">{getRiskLevel(item.severity).label}</span>
                  </div>
                  <p className="rounded-xl bg-surface p-3 text-sm whitespace-pre-wrap text-text">
                    {item.target?.text || 'Không có nội dung văn bản'}
                  </p>
                  <CaseContextTags item={item} visibility={status} />
                  <RiskTags item={item} />
                  <p className="text-xs text-text-muted">
                    Điểm ưu tiên được tính từ luật, cờ AI và số báo cáo. AI gắn cờ đóng góp 60 điểm. Hồ sơ có thể giữ
                    điểm cao nhất từ các lần đánh giá trước. Cần xem bằng chứng và ngữ cảnh trước khi kết luận vi phạm.
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-2 md:grid-cols-3">
                <Meta label="ID nội dung" value={<code title={item.targetId}>#{shortId(item.targetId)}</code>} />
                <Meta label="Tác giả" value={<code title={item.authorId}>@{shortId(item.authorId)}</code>} />
                <Meta label="Báo cáo" value={item.reports.length} />
                <Meta label="Hồ sơ tạo" value={formatDateTime(item.createdAt)} />
                <Meta label="Cập nhật" value={formatDateTime(item.updatedAt)} />
                <Meta
                  label="Lý do ghi nhận"
                  value={<span className="text-danger">{recordedReasons || 'Chưa có lý do cụ thể'}</span>}
                />
              </dl>

              <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
                <label className={fieldLabelClass} htmlFor="mod-reason-select">
                  <span>
                    Lý do quyết định vi phạm <span className="text-danger">*</span>
                  </span>
                  <select
                    id="mod-reason-select"
                    className={controlClass}
                    value={reasonCode}
                    onChange={(event) => setReasonCode(event.target.value as typeof reasonCode)}
                  >
                    {reasonKeys.map((key) => (
                      <option key={key} value={key}>
                        {text.reasons[key]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={fieldLabelClass} htmlFor="mod-notes-input">
                  Nhận xét xử lý
                  <textarea
                    id="mod-notes-input"
                    className={`${controlClass} h-24 py-2`}
                    maxLength={500}
                    placeholder="Ghi chú cho đồng nghiệp và nhật ký kiểm toán (tối đa 500 ký tự)"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </label>
                <AdminApiError error={decision.error} />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button onClick={onClose}>Đóng</Button>
                  {item.status === 'pending' && (
                    <Button disabled={decision.isPending || !reasonCode} onClick={() => decision.mutate('dismiss')}>
                      {status === 'held' ? vi.api.moderationReleaseHeld : 'Đóng hồ sơ'}
                    </Button>
                  )}
                  {status && ['visible', 'published', 'held'].includes(status) && (
                    <Button
                      variant="primary"
                      disabled={decision.isPending || !reasonCode}
                      onClick={() => decision.mutate('hide')}
                    >
                      Ẩn (Tạm thời)
                    </Button>
                  )}
                  {status && ['held', 'hidden', 'removed'].includes(status) && (
                    <Button
                      variant="accent"
                      disabled={decision.isPending || !reasonCode}
                      onClick={() => decision.mutate('restore')}
                    >
                      {status === 'held' ? vi.api.moderationReleaseHeld : 'Khôi phục'}
                    </Button>
                  )}
                  {status && ['visible', 'published', 'hidden', 'held'].includes(status) && (
                    <Button
                      variant="danger"
                      disabled={decision.isPending || !reasonCode}
                      onClick={() => {
                        if (window.confirm('Gỡ nội dung này khỏi giao diện người dùng?')) decision.mutate('remove');
                      }}
                    >
                      Gỡ
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {tab === 'reports' &&
            (item.reports.length === 0 ? (
              <p className="text-sm text-text-muted">Chưa có báo cáo người dùng trực tiếp.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {item.reports.map((report) => (
                  <li key={report.id} className="rounded-xl border border-border bg-surface p-3">
                    <strong className="text-sm">
                      {text.reasons[report.reasonCode as keyof typeof text.reasons] ?? report.reasonCode}
                    </strong>
                    {report.reasonDetail && <p className="mt-1 text-sm">{report.reasonDetail}</p>}
                    <span className="mt-1 block text-xs text-text-subtle">{formatDateTime(report.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ))}

          {tab === 'history' && <LogTable items={item.actions} />}
        </>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2">
      <dt className="text-[11px] font-semibold text-text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold">{value}</dd>
    </div>
  );
}

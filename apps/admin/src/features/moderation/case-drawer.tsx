'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { moderationApi, useApiSession } from '@tripflix/api-client';
import type { DecisionDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { AdminButton } from '@/ui/button';
import { ConfirmDialog } from '@/ui/dialog';
import { DetailDrawer } from '@/ui/detail-drawer';
import { DetailSection, KeyValueList } from '@/ui/detail-parts';
import { SelectField } from '@/ui/filter-toolbar';
import { LoadingState } from '@/ui/states';
import { StatusBadge } from '@/ui/status-badge';
import { TabPanel, Tabs } from '@/ui/tabs';
import { buildDrawerNavigation } from '@/ui/use-detail-param';
import { AdminApiError } from '../shell/api-state';
import { CaseContextTags } from './case-context-tags';
import { ModerationAuthor } from './moderation-author';
import { ModerationContext } from './moderation-context';
import { LogTable } from './moderation-log';
import { ModerationParts } from './moderation-parts';
import { applyDecision, formatDateTime, severityTone } from './moderation-shared';
import { ReviewLeasePanel, useReviewTime } from './review-lease-panel';
import { canDecideReview } from './review-lease-state';
import { getRiskLevel } from './risk-level';
import { RiskTags } from './risk-tags';

const text = vi.moderation;
const copy = vi.moderationConsole.drawer;
const reviewText = vi.moderation.review;
const reasonKeys = Object.keys(text.reasons) as (keyof typeof text.reasons)[];
const TAB_IDS = ['info', 'reports', 'history'] as const;
type CaseTab = (typeof TAB_IDS)[number];

interface DecisionForm {
  caseId: string;
  reasonCode: DecisionDto['reasonCode'] | '';
  notes: string;
}

/**
 * Hồ sơ kiểm duyệt trong drawer: xem nội dung, báo cáo, lịch sử và ra quyết định mà không rời hàng đợi.
 * Lý do và nhận xét gắn với từng hồ sơ; chuyển hồ sơ khác thì form trống (drawer đã hỏi xác nhận nếu chưa lưu).
 * Quyết định xong → `onDecided` để hàng đợi chuyển sang hồ sơ kế tiếp.
 */
export function CaseDrawer({
  id,
  ids,
  onOpen,
  onClose,
  onDecided,
}: {
  id: string;
  ids: readonly string[];
  onOpen: (id: string) => void;
  onClose: () => void;
  onDecided: () => void;
}) {
  const client = useQueryClient();
  const { user } = useApiSession();
  const now = useReviewTime();
  const [tab, setTab] = useState<CaseTab>('info');
  const [form, setForm] = useState<DecisionForm>({ caseId: id, reasonCode: '', notes: '' });
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const current = form.caseId === id ? form : { caseId: id, reasonCode: '' as const, notes: '' };
  const { reasonCode, notes } = current;
  const setField = (patch: Partial<Omit<DecisionForm, 'caseId'>>) => setForm({ ...current, ...patch });

  const detail = useQuery({
    queryKey: ['moderation', 'detail', id, user?.id],
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 10_000,
    queryFn: ({ signal }) => moderationApi.detail(id, signal),
  });
  const item = detail.data;
  const canDecide = !!item && canDecideReview(item, user?.id, now);

  const decision = useMutation({
    mutationFn: (action: DecisionDto['action']) => {
      if (!reasonCode || !detail.data || !canDecideReview(detail.data, user?.id, now))
        throw new Error(text.chooseReason);
      return applyDecision(detail.data, { action, reasonCode, reasonDetail: notes.trim() || undefined });
    },
    onError: () => client.invalidateQueries({ queryKey: ['moderation'] }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['moderation'] }),
        client.invalidateQueries({ queryKey: ['social'] }),
        client.invalidateQueries({ queryKey: ['admin-posts'] }),
      ]);
      setForm({ caseId: id, reasonCode: '', notes: '' });
      onDecided();
    },
  });

  const kindLabel = item?.targetType === 'comment' ? vi.moderationConsole.commentKind : vi.moderationConsole.postKind;
  const title = item
    ? item.target?.text?.trim().slice(0, 90) ||
      t('moderationConsole.drawer.untitledCase', { kind: kindLabel, id: item.targetId.slice(0, 8) })
    : id.slice(0, 8);
  const reasons = item
    ? [
        ...new Set([
          typeof item.flags.reasonCode === 'string' ? item.flags.reasonCode : null,
          ...item.reports.map((report) => report.reasonCode),
        ]),
      ].flatMap((code) =>
        code && code in text.reasons ? [text.reasons[code as keyof typeof text.reasons]] : [],
      )
    : [];
  const isTargetLive = !!item?.target && ['visible', 'published', 'held'].includes(item.target.status);
  const targetStatus = item?.target?.status;

  const footer = item ? (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <SelectField
          label={copy.reasonLabel}
          value={reasonCode}
          allLabel={text.chooseReason}
          options={reasonKeys.map((key) => ({ value: key, label: text.reasons[key] }))}
          onChange={(value) => setField({ reasonCode: value as DecisionForm['reasonCode'] })}
        />
        <input
          aria-label={copy.noteLabel}
          placeholder={text.note}
          maxLength={500}
          value={notes}
          onChange={(event) => setField({ notes: event.target.value })}
          className="adm-control h-8 min-w-48 flex-1 rounded-adm border border-border bg-background px-2.5 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal"
        />
      </div>
      <AdminApiError error={decision.error} />
      <div className="flex flex-wrap justify-end gap-2">
        {item.status === 'pending' && (
          <AdminButton
            variant="primary"
            disabled={decision.isPending || !reasonCode || !canDecide}
            onClick={() => decision.mutate('dismiss')}
          >
            {targetStatus === 'held' ? vi.api.moderationReleaseHeld : copy.closeCase}
          </AdminButton>
        )}
        {isTargetLive && (
          <AdminButton
            disabled={decision.isPending || !reasonCode || !canDecide}
            onClick={() => decision.mutate('hide')}
          >
            {copy.hideTemp}
          </AdminButton>
        )}
        {!!targetStatus &&
          ['held', 'hidden', 'removed'].includes(targetStatus) &&
          (targetStatus !== 'held' || item.status !== 'pending') && (
            <AdminButton
              disabled={decision.isPending || !reasonCode || !canDecide}
              onClick={() => decision.mutate('restore')}
            >
              {targetStatus === 'held' ? vi.api.moderationReleaseHeld : copy.restore}
            </AdminButton>
          )}
        {!!targetStatus && ['visible', 'published', 'hidden', 'held'].includes(targetStatus) && (
          <AdminButton
            variant="danger"
            disabled={decision.isPending || !reasonCode || !canDecide}
            onClick={() => setIsRemoveOpen(true)}
          >
            {copy.remove}
          </AdminButton>
        )}
      </div>
    </div>
  ) : undefined;

  return (
    <>
      <DetailDrawer
        size="wide"
        title={title}
        status={
          item && (
            <>
              <StatusBadge tone={severityTone(item.severity)}>{item.severity}</StatusBadge>
              <StatusBadge tone={item.status === 'pending' ? 'warning' : 'success'}>
                {item.status === 'pending'
                  ? copy.pending
                  : item.resolution === 'restore'
                    ? copy.restored
                    : copy.resolved}
              </StatusBadge>
            </>
          )
        }
        subtitle={item && `${kindLabel} #${item.targetId.slice(0, 8)} · ${formatDateTime(item.createdAt)}`}
        navigation={buildDrawerNavigation(ids, id, onOpen)}
        isDirty={!!reasonCode || !!notes.trim()}
        scrollKey={id}
        onClose={onClose}
        footer={footer}
        tabs={
          <Tabs
            label={copy.tabsLabel}
            idPrefix="case"
            active={tab}
            onChange={setTab}
            tabs={[
              { id: 'info', label: copy.info },
              { id: 'reports', label: t('moderationConsole.drawer.reports', { count: item?.reports.length ?? 0 }) },
              { id: 'history', label: copy.history },
            ]}
          />
        }
      >
        <AdminApiError error={detail.error} retry={() => void detail.refetch()} />
        {detail.isPending && <LoadingState rows={5} />}
        {item && (
          <TabPanel idPrefix="case" active={tab}>
            {tab === 'info' && (
              <>
                <ReviewLeasePanel item={item} />
                <DetailSection title={kindLabel}>
                  {item.target?.coverUrl && (
                    <Image
                      src={item.target.coverUrl}
                      alt={text.cover}
                      className="mb-3 max-h-72 w-full rounded-adm object-contain"
                      width={800}
                      height={400}
                      unoptimized
                    />
                  )}
                  <p className="text-sm leading-6 break-words whitespace-pre-wrap">
                    {item.target?.text || copy.noText}
                  </p>
                  <div className="mt-3 space-y-2">
                    <CaseContextTags item={item} visibility={targetStatus} />
                    <RiskTags item={item} />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-text-muted">{copy.priorityNote}</p>
                </DetailSection>
                <DetailSection title={vi.moderation.detail}>
                  <KeyValueList
                    items={[
                      { label: copy.kind, value: kindLabel },
                      {
                        label: copy.priority,
                        value: t('moderationConsole.drawer.priorityValue', {
                          score: item.severity,
                          level: getRiskLevel(item.severity).label,
                        }),
                      },
                      { label: copy.reportCount, value: item.reports.length },
                      { label: copy.recordedReasons, value: reasons.join(', ') || copy.noReason },
                      { label: copy.caseCreated, value: formatDateTime(item.createdAt) },
                      { label: copy.targetId, value: item.targetId, isCode: true },
                    ]}
                  />
                </DetailSection>
                <ModerationAuthor authorId={item.authorId} author={item.author} targetType={item.targetType} />
                {item.targetType === 'post' && <ModerationParts postId={item.targetId} />}
                {item.targetType === 'comment' && (
                  <ModerationContext
                    postId={item.postId}
                    commentId={item.targetId}
                    post={item.postContext}
                    parent={item.parentComment}
                    commentStatus={item.target?.status}
                  />
                )}
              </>
            )}
            {tab === 'reports' &&
              (item.reports.length === 0 ? (
                <p className="text-[13px] text-text-muted">{copy.noReports}</p>
              ) : (
                <ul className="divide-y divide-border border-y border-border">
                  {item.reports.map((report) => (
                    <li key={report.id} className="py-3 text-[13px]">
                      <p>{text.reasons[report.reasonCode as keyof typeof text.reasons] ?? report.reasonCode}</p>
                      {report.reasonDetail && <p className="mt-0.5 text-text-muted">{report.reasonDetail}</p>}
                      <time dateTime={report.createdAt} className="text-xs text-text-muted">
                        {formatDateTime(report.createdAt)}
                      </time>
                    </li>
                  ))}
                </ul>
              ))}
            {tab === 'history' && (
              <>
                <LogTable items={item.actions} />
                <DetailSection title={reviewText.audit}>
                  {(item.reviewAudit ?? []).length === 0 ? (
                    <p className="text-[13px] text-text-muted">{copy.noActions}</p>
                  ) : (
                    <ul className="space-y-1 text-[13px]">
                      {(item.reviewAudit ?? []).map((entry) => (
                        <li key={entry.id}>
                          <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time> · #
                          {entry.actorId.slice(0, 8)} ·{' '}
                          {reviewText[entry.action as 'claim' | 'renew' | 'release' | 'evidence_view'] ??
                            entry.action}
                        </li>
                      ))}
                    </ul>
                  )}
                </DetailSection>
              </>
            )}
          </TabPanel>
        )}
      </DetailDrawer>
      {isRemoveOpen && (
        <ConfirmDialog
          title={copy.removeTitle}
          description={copy.removeBody}
          confirmLabel={copy.remove}
          tone="danger"
          isPending={decision.isPending}
          onClose={() => setIsRemoveOpen(false)}
          onConfirm={() => {
            setIsRemoveOpen(false);
            decision.mutate('remove');
          }}
        />
      )}
    </>
  );
}

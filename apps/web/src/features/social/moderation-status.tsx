'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi, useApiSession } from '@tripflix/api-client';
import { t, vi } from '@tripflix/i18n';
import { ApiErrorNotice } from '@/features/shared/api-state';
import { LoadingDots } from '@/features/shared/loading-dots';
import { getAppealDaysLeft } from './appeal-days';
import segmentedTabs from '../shared/segmented-tabs.module.css';
import styles from './moderation-status.module.css';

const text = vi.moderation.myStatus;

type Tone = 'warning' | 'danger' | 'success' | 'neutral';
const actionTones: Record<string, Tone> = {
  hide: 'warning',
  auto_hide: 'warning',
  remove: 'danger',
  restore: 'success',
  dismiss: 'neutral',
};
const appealBoxes = {
  pending: { tone: 'warning', title: text.appealPending, hint: text.appealPendingHint, icon: 'hourglass' },
  overturned: {
    tone: 'success',
    title: text.appealOverturned,
    hint: text.appealOverturnedHint,
    icon: 'check',
  },
  upheld: { tone: 'neutral', title: text.appealUpheld, hint: text.appealUpheldHint, icon: 'gavel' },
} as const;

// Icon nét mảnh, cùng kiểu icon menu tài khoản.
const ICONS: Record<string, ReactNode> = {
  comment: <path d="M4 5h16v11H9l-5 4z" />,
  post: <path d="M5 4h14v16H5zM8 9h8M8 13h8M8 17h5" />,
  flag: <path d="M5 21V4m0 0h11l-2 4 2 4H5" />,
  hourglass: <path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9" />,
  check: <path d="m5 12 5 5 9-10" />,
  gavel: <path d="m14 4 6 6M11 7l6 6M12.5 5.5l-6 6 4 4 6-6M8.5 13.5 3 19l2 2 5.5-5.5" />,
  clock: <path d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18" />,
  inbox: <path d="M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6z" />,
};

function Icon({ name }: { name: string }) {
  return (
    <svg className={styles.icon} aria-hidden="true" viewBox="0 0 24 24">
      {ICONS[name]}
    </svg>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  return `${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · ${date.toLocaleDateString('vi-VN')}`;
}

function reasonLabel(code: string) {
  return vi.moderation.reasons[code as keyof typeof vi.moderation.reasons] ?? vi.moderation.reasons.OTHER;
}

function TargetChip({ type }: { type: string }) {
  return (
    <span className={styles.chip}>
      <Icon name={type === 'post' ? 'post' : 'comment'} />
      {type === 'post' ? vi.moderation.post : vi.moderation.comment}
    </span>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>
        <Icon name="inbox" />
      </span>
      <p>{children}</p>
    </div>
  );
}

export function ModerationStatus() {
  const { user } = useApiSession();
  const client = useQueryClient();
  const [tab, setTab] = useState<'decisions' | 'reports'>('decisions');
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
    mutationFn: ({ id, text: appealText }: { id: string; text: string }) =>
      moderationApi.submitAppeal(id, appealText),
    onSuccess: async () => {
      setSelected(null);
      setReason('');
      await client.invalidateQueries({ queryKey: ['my-moderation'] });
    },
  });
  if (!user)
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>{text.title}</h1>
        <Link className="primary-button" href="/login?returnTo=%2Faccount%2Fmoderation">
          {text.login}
        </Link>
      </main>
    );
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const reportItems = reports.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{text.title}</h1>
        <p className={styles.intro}>{text.intro}</p>
      </header>
      <div className={`${segmentedTabs.tabs} ${segmentedTabs.tabsAuto} ${styles.tabs}`} role="tablist">
        {(['decisions', 'reports'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`moderation-tab-${key}`}
            aria-controls={`moderation-panel-${key}`}
            aria-selected={tab === key}
            className={segmentedTabs.tab}
            onClick={() => setTab(key)}
          >
            {key === 'decisions' ? text.tabDecisions : text.tabReports}
          </button>
        ))}
      </div>

      {tab === 'decisions' ? (
        <section
          id="moderation-panel-decisions"
          role="tabpanel"
          aria-labelledby="moderation-tab-decisions"
          className={styles.list}
        >
          {query.isPending && <LoadingDots isBlock />}
          <ApiErrorNotice error={query.error} />
          {!query.isPending && !query.error && !items.length && <EmptyState>{text.empty}</EmptyState>}
          {items.map((item) => {
            const appeal = item.appealStatus ? appealBoxes[item.appealStatus] : null;
            const isAppealClosed =
              !item.canAppeal && !item.appealStatus && ['hide', 'auto_hide', 'remove'].includes(item.action);
            return (
              <article key={item.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <TargetChip type={item.targetType} />
                  <span className={styles.badge} data-tone={actionTones[item.action] ?? 'neutral'}>
                    {text.actions[item.action as keyof typeof text.actions] ?? item.action}
                  </span>
                  <time className={styles.time} dateTime={item.createdAt}>
                    {formatTime(item.createdAt)}
                  </time>
                </div>
                {item.targetPreview && <blockquote className={styles.quote}>{item.targetPreview}</blockquote>}
                <div className={styles.reason}>
                  <span className={styles.reasonIcon}>
                    <Icon name="flag" />
                  </span>
                  <div>
                    <span className={styles.reasonLabel}>{vi.moderation.reason}</span>
                    <span className={styles.reasonPill}>{reasonLabel(item.reasonCode)}</span>
                  </div>
                </div>
                {appeal && (
                  <div className={styles.appealBox} data-tone={appeal.tone}>
                    <span className={styles.appealIcon}>
                      <Icon name={appeal.icon} />
                    </span>
                    <div>
                      <p className={styles.appealTitle}>{appeal.title}</p>
                      <p className={styles.appealHint}>{appeal.hint}</p>
                    </div>
                  </div>
                )}
                {isAppealClosed && <p className={styles.footerNote}>{text.appealClosed}</p>}
                {item.canAppeal && selected !== item.id && (
                  <div className={styles.footer}>
                    <span className={styles.footerNote}>
                      <Icon name="clock" />
                      {t('moderation.myStatus.daysLeft', { days: getAppealDaysLeft(item.createdAt) })}
                    </span>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => {
                        setSelected(item.id);
                        setReason('');
                        submit.reset();
                      }}
                    >
                      {text.appeal}
                    </button>
                  </div>
                )}
                {selected === item.id && (
                  <form
                    className={styles.form}
                    onSubmit={(event) => {
                      event.preventDefault();
                      submit.mutate({ id: item.id, text: reason.trim() });
                    }}
                  >
                    <label htmlFor={`appeal-${item.id}`}>{text.appealReason}</label>
                    <textarea
                      id={`appeal-${item.id}`}
                      value={reason}
                      maxLength={1000}
                      required
                      rows={4}
                      placeholder={text.appealPlaceholder}
                      onChange={(event) => setReason(event.target.value)}
                    />
                    <ApiErrorNotice error={submit.error} />
                    <div className={styles.formActions}>
                      <button type="button" className="secondary-button" onClick={() => setSelected(null)}>
                        {text.cancel}
                      </button>
                      <button
                        type="submit"
                        className="primary-button"
                        disabled={submit.isPending || !reason.trim()}
                      >
                        {text.send}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
          {query.hasNextPage && (
            <button
              type="button"
              className={`secondary-button ${styles.more}`}
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {text.more}
            </button>
          )}
        </section>
      ) : (
        <section
          id="moderation-panel-reports"
          role="tabpanel"
          aria-labelledby="moderation-tab-reports"
          className={styles.list}
        >
          {reports.isPending && <LoadingDots isBlock label={text.loadingReports} />}
          <ApiErrorNotice error={reports.error} />
          {!reports.isPending && !reports.error && !reportItems.length && (
            <EmptyState>{text.emptyReports}</EmptyState>
          )}
          {reportItems.map((report) => (
            <article key={report.id} className={styles.card}>
              <div className={styles.cardTop}>
                <TargetChip type={report.targetType} />
                <span className={styles.reasonPill}>{reasonLabel(report.reasonCode)}</span>
                <time className={styles.time} dateTime={report.createdAt}>
                  {formatTime(report.createdAt)}
                </time>
              </div>
              <span
                className={styles.badge}
                data-tone={
                  report.caseStatus === 'resolved'
                    ? 'success'
                    : report.caseStatus === 'pending'
                      ? 'warning'
                      : 'neutral'
                }
              >
                {report.caseStatus === 'resolved'
                  ? text.reportResolved
                  : report.caseStatus === 'pending'
                    ? text.reportPending
                    : text.reportReceived}
              </span>
            </article>
          ))}
          {reports.hasNextPage && (
            <button
              type="button"
              className={`secondary-button ${styles.more}`}
              disabled={reports.isFetchingNextPage}
              onClick={() => void reports.fetchNextPage()}
            >
              {text.more}
            </button>
          )}
        </section>
      )}
    </main>
  );
}

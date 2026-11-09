'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { moderationApi } from '@tripflix/api-client';
import type {
  AdminModerationControllerActionsParams,
  AdminModerationControllerQueueParams,
  DecisionDto,
  ModerationLogDto,
} from '@tripflix/api-client/core-api/model/index';
import { vi } from '@tripflix/i18n';
import { AdminApiError } from '../shell/api-state';
import { PostModeration } from './post-moderation';

const text = vi.moderation;
const reasonKeys = Object.keys(text.reasons) as (keyof typeof text.reasons)[];
const date = (value: string) => new Date(value).toLocaleString('vi-VN');
const actionLabel = (value: string) =>
  text[value as 'hide' | 'restore' | 'remove' | 'dismiss' | 'auto_hide'] ?? value;

export function ModerationWorkspace() {
  const [tab, setTab] = useState<'queue' | 'log' | 'posts'>('queue');
  return (
    <>
      <nav className="admin-filters" aria-label={vi.admin.moderation}>
        {(['queue', 'log', 'posts'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={tab === value ? 'admin-primary' : 'admin-secondary'}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {text[value]}
          </button>
        ))}
      </nav>
      {tab === 'queue' ? <ModerationQueue /> : tab === 'log' ? <ModerationLog /> : <PostModeration />}
    </>
  );
}

function ModerationQueue() {
  const [filters, setFilters] = useState<AdminModerationControllerQueueParams>({ status: 'pending' });
  const [selected, setSelected] = useState('');
  const query = useInfiniteQuery({
    queryKey: ['moderation', 'queue', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => moderationApi.queue({ ...filters, cursor: pageParam }, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  function setFilter(key: keyof AdminModerationControllerQueueParams, value: string) {
    setFilters((current) => ({ ...current, [key]: value || undefined }));
    setSelected('');
  }
  return (
    <>
      <div className="admin-filters">
        <label>
          {vi.api.status}
          <select value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
            <option value="pending">{text.pending}</option>
            <option value="resolved">{text.resolved}</option>
          </select>
        </label>
        <label>
          {text.target}
          <select
            value={filters.targetType ?? ''}
            onChange={(event) => setFilter('targetType', event.target.value)}
          >
            <option value="">{vi.api.all}</option>
            <option value="post">{text.post}</option>
            <option value="comment">{text.comment}</option>
          </select>
        </label>
        <label>
          {text.sources}
          <select value={filters.source ?? ''} onChange={(event) => setFilter('source', event.target.value)}>
            <option value="">{vi.api.all}</option>
            {(['rule', 'ai', 'report'] as const).map((source) => (
              <option key={source} value={source}>
                {text[source]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {text.reason}
          <select
            value={filters.reasonCode ?? ''}
            onChange={(event) => setFilter('reasonCode', event.target.value)}
          >
            <option value="">{vi.api.all}</option>
            {reasonKeys.map((reason) => (
              <option key={reason} value={reason}>
                {text.reasons[reason]}
              </option>
            ))}
          </select>
        </label>
        <button
          className="admin-secondary"
          onClick={() => {
            void query.refetch();
          }}
        >
          {vi.api.refresh}
        </button>
      </div>
      <AdminApiError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <output>{vi.api.loading}</output>}
      {query.data?.pages[0]?.items.length === 0 && <p className="admin-empty">{vi.api.empty}</p>}
      <div className="admin-table-scroll">
        <table>
          <thead>
            <tr>
              <th>{text.target}</th>
              <th>{text.severity}</th>
              <th>{text.sources}</th>
              <th>{text.reportCount}</th>
              <th>{text.time}</th>
              <th>{vi.api.detail}</th>
            </tr>
          </thead>
          <tbody>
            {query.data?.pages
              .flatMap((page) => page.items)
              .map((item) => (
                <tr key={item.id} aria-selected={selected === item.id}>
                  <td>
                    {text[item.targetType]} <small>{item.targetId.slice(0, 8)}</small>
                    {item.isAutoHidden && <span className="admin-badge">{text.autoHidden}</span>}
                  </td>
                  <td>{item.severity}</td>
                  <td>
                    {item.sources
                      .map((source) => text[source as 'rule' | 'ai' | 'report'] ?? source)
                      .join(', ')}
                  </td>
                  <td>{item.reportCount}</td>
                  <td>{date(item.createdAt)}</td>
                  <td>
                    <button className="admin-text-button" onClick={() => setSelected(item.id)}>
                      {vi.api.detail}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {query.hasNextPage && (
        <button
          className="admin-secondary"
          disabled={query.isFetchingNextPage}
          onClick={() => {
            void query.fetchNextPage();
          }}
        >
          {vi.api.next}
        </button>
      )}
      {selected ? (
        <CaseDetail key={selected} id={selected} />
      ) : (
        <p className="admin-empty">{text.selected}</p>
      )}
    </>
  );
}

function CaseDetail({ id }: { id: string }) {
  const client = useQueryClient();
  const [reasonCode, setReasonCode] = useState<DecisionDto['reasonCode'] | ''>('');
  const [reasonDetail, setReasonDetail] = useState('');
  const detail = useQuery({
    queryKey: ['moderation', 'detail', id],
    queryFn: ({ signal }) => moderationApi.detail(id, signal),
  });
  const decision = useMutation({
    mutationFn: (action: DecisionDto['action']) => {
      if (!reasonCode) throw new Error(text.chooseReason);
      const body = { action, reasonCode, reasonDetail: reasonDetail.trim() || undefined };
      return detail.data?.status === 'resolved' && detail.data.targetType === 'comment'
        ? moderationApi.commentAction(detail.data.targetId, body)
        : moderationApi.decide(id, body);
    },
    onSuccess: async () => {
      setReasonCode('');
      setReasonDetail('');
      await Promise.all([
        client.invalidateQueries({ queryKey: ['moderation'] }),
        client.invalidateQueries({ queryKey: ['social'] }),
      ]);
    },
  });
  const item = detail.data;
  return (
    <section className="moderation-case" aria-label={text.detail}>
      <h2>{text.detail}</h2>
      <AdminApiError
        error={detail.error}
        retry={() => {
          void detail.refetch();
        }}
      />
      {detail.isPending && <output>{vi.api.loading}</output>}
      {item && (
        <>
          <p>
            <span className="admin-badge">{text[item.targetType]}</span>{' '}
            {text[item.target?.status as 'hidden' | 'visible' | 'published'] ?? item.target?.status} ·{' '}
            {date(item.createdAt)}
          </p>
          {item.target?.coverUrl && (
            <Image className="moderation-cover" src={item.target.coverUrl} alt={text.cover} width={540} height={960} unoptimized />
          )}
          <p className="moderation-body">{item.target?.text ?? vi.api.missing}</p>
          {item.targetType === 'comment' && <p>{text.cascadeNotice}</p>}
          <h3>{text.evidence}</h3>
          <Evidence flags={item.flags} />
          <h3>{text.reports}</h3>
          {item.reports.length === 0 ? (
            <p>{vi.api.empty}</p>
          ) : (
            <ul>
              {item.reports.map((report) => (
                <li key={report.id}>
                  {text.reasons[report.reasonCode as keyof typeof text.reasons] ?? report.reasonCode} —{' '}
                  {report.reasonDetail} <small>{date(report.createdAt)}</small>
                </li>
              ))}
            </ul>
          )}
          <div className="admin-filters">
            <label>
              {text.reason}
              <select
                value={reasonCode}
                onChange={(event) => {
                  setReasonCode(event.target.value as typeof reasonCode);
                  decision.reset();
                }}
              >
                <option value="">{text.chooseReason}</option>
                {reasonKeys.map((reason) => (
                  <option key={reason} value={reason}>
                    {text.reasons[reason]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {text.note}
              <textarea
                maxLength={500}
                value={reasonDetail}
                onChange={(event) => setReasonDetail(event.target.value)}
              />
            </label>
          </div>
          <AdminApiError error={decision.error} />
          {decision.isSuccess && <output>{text.saved}</output>}
          <div className="admin-filters">
            {(['hide', 'restore', 'remove', 'dismiss'] as const).map((action) => (
              <button
                key={action}
                className={action === 'hide' ? 'admin-primary' : 'admin-secondary'}
                disabled={
                  !reasonCode ||
                  decision.isPending ||
                  (item.status === 'resolved' && (item.targetType !== 'comment' || action === 'dismiss'))
                }
                onClick={() => decision.mutate(action)}
              >
                {text[action]}
              </button>
            ))}
          </div>
          <h3>{text.log}</h3>
          <LogTable items={item.actions} />
        </>
      )}
    </section>
  );
}
function Evidence({ flags }: { flags: Record<string, unknown> }) {
  const rules = Array.isArray(flags.rules) ? flags.rules : [];
  const ai = flags.ai && typeof flags.ai === 'object' ? (flags.ai as Record<string, unknown>) : null;
  const scores = ai?.scores && typeof ai.scores === 'object' ? Object.entries(ai.scores) : [];
  return (
    <>
      {flags.aiUnavailable === true && <p>{text.aiUnavailable}</p>}
      <ul>
        {rules.map((rule, index) => {
          const hit = rule as { code?: string; match?: string };
          return (
            <li key={index}>
              {hit.code}: <mark>{hit.match}</mark>
            </li>
          );
        })}
        {scores
          .filter(([, score]) => typeof score === 'number' && score >= 0.1)
          .map(([category, score]) => (
            <li key={category}>
              {category}: {typeof score === 'number' ? `${Math.round(score * 100)}%` : ''}
            </li>
          ))}
      </ul>
      {!rules.length && !scores.length && <p>{text.cleanEvidence}</p>}
    </>
  );
}
function ModerationLog() {
  const [filters, setFilters] = useState<AdminModerationControllerActionsParams>({});
  const query = useInfiniteQuery({
    queryKey: ['moderation', 'log', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) => moderationApi.log({ ...filters, cursor: pageParam }, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  return (
    <>
      <h2>{text.log}</h2>
      <form
        className="admin-filters"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const value = (key: string) => String(data.get(key) ?? '').trim() || undefined;
          setFilters({
            targetId: value('targetId'),
            moderatorId: value('moderatorId'),
            from: value('from') ? new Date(value('from')!).toISOString() : undefined,
            to: value('to') ? new Date(value('to')!).toISOString() : undefined,
          });
        }}
      >
        <label>
          {text.targetId}
          <input name="targetId" />
        </label>
        <label>
          {text.actorId}
          <input name="moderatorId" />
        </label>
        <label>
          {text.from}
          <input name="from" type="datetime-local" />
        </label>
        <label>
          {text.to}
          <input name="to" type="datetime-local" />
        </label>
        <button className="admin-secondary" type="submit">
          {text.apply}
        </button>
      </form>
      <AdminApiError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
      {query.isPending && <output>{vi.api.loading}</output>}
      {query.data && <LogTable items={query.data.pages.flatMap((page) => page.items)} />}
      {query.hasNextPage && (
        <button
          className="admin-secondary"
          disabled={query.isFetchingNextPage}
          onClick={() => {
            void query.fetchNextPage();
          }}
        >
          {vi.api.next}
        </button>
      )}
    </>
  );
}
function LogTable({ items }: { items: ModerationLogDto[] }) {
  if (!items.length) return <p className="admin-empty">{vi.api.empty}</p>;
  return (
    <div className="admin-table-scroll">
      <table>
        <thead>
          <tr>
            <th>{text.time}</th>
            <th>{text.target}</th>
            <th>{text.actor}</th>
            <th>{text.action}</th>
            <th>{text.reason}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{date(item.createdAt)}</td>
              <td>{item.commentId ?? item.postId}</td>
              <td>{item.actorType === 'system' ? text.system : item.moderatorId}</td>
              <td>{actionLabel(item.action)}</td>
              <td>
                {text.reasons[item.reasonCode as keyof typeof text.reasons] ?? item.reasonCode}
                {item.reasonDetail && <p>{item.reasonDetail}</p>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

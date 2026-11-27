'use client';
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HttpError } from '@tripflix/api-client';
import {
  adminModerationKeywordRulesControllerCreate,
  adminModerationKeywordRulesControllerList,
  adminModerationKeywordRulesControllerListBuiltIn,
  adminModerationKeywordRulesControllerRemove,
  adminModerationKeywordRulesControllerUpdate,
} from '@tripflix/api-client/core-api/moderation-admin/moderation-admin';
import type { ModerationKeywordRuleDto } from '@tripflix/api-client/core-api/model/index';
import { t, vi } from '@tripflix/i18n';
import { AdminButton } from '@/ui/button';
import { ConfirmDialog } from '@/ui/dialog';
import { TextField } from '@/ui/form-field';
import { EmptyState, LoadingState } from '@/ui/states';
import { StatusBadge } from '@/ui/status-badge';
import { AdminApiError } from '../shell/api-state';
import { formatDateTime } from './moderation-shared';

const copy = vi.moderationConsole.keywordRules;
const builtInLabels: Readonly<Record<string, string>> = copy.builtInLabels;
const queryKey = ['moderation', 'keyword-rules'] as const;
type Change =
  | { action: 'create'; keyword: string }
  | { action: 'rename'; id: string; keyword: string }
  | { action: 'delete'; id: string }
  | { action: 'toggle'; id: string; enabled: boolean };

export function ModerationKeywordRules() {
  const client = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ModerationKeywordRuleDto | null>(null);
  const [keyword, setKeyword] = useState('');
  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => (await adminModerationKeywordRulesControllerList({ signal })).data,
  });
  const builtIn = useQuery({
    queryKey: ['moderation', 'built-in-keyword-rules'],
    queryFn: async ({ signal }) => (await adminModerationKeywordRulesControllerListBuiltIn({ signal })).data,
  });
  const save = useMutation({
    mutationFn: async (change: Change) => {
      switch (change.action) {
        case 'create':
          return (await adminModerationKeywordRulesControllerCreate({ keyword: change.keyword, enabled: true })).data;
        case 'rename':
          return (await adminModerationKeywordRulesControllerUpdate(change.id, { keyword: change.keyword })).data;
        case 'toggle':
          return (await adminModerationKeywordRulesControllerUpdate(change.id, { enabled: change.enabled })).data;
        case 'delete':
          await adminModerationKeywordRulesControllerRemove(change.id);
          return;
      }
    },
    onSuccess: async (_rule, change) => {
      if (change.action === 'delete') {
        client.setQueryData<ModerationKeywordRuleDto[]>(queryKey, (rules) =>
          rules?.filter((rule) => rule.id !== change.id),
        );
        setDeleting(null);
      }
      if (
        change.action === 'create' ||
        change.action === 'rename' ||
        (change.action === 'delete' && editing === change.id)
      ) {
        setEditing(null);
        setKeyword('');
      }
      await client.invalidateQueries({ queryKey });
    },
  });

  const duplicate = save.error instanceof HttpError && save.error.status === 409;
  const rules = query.data ?? [];
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextKeyword = keyword.trim();
    if (!nextKeyword) return;
    save.mutate(editing ? { action: 'rename', id: editing, keyword: nextKeyword } : { action: 'create', keyword: nextKeyword });
  }

  function edit(rule: ModerationKeywordRuleDto) {
    save.reset();
    setEditing(rule.id);
    setKeyword(rule.keyword);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">{copy.customHeading}</h2>
      <p className="text-[13px] text-text-muted">{copy.hint}</p>
      <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
        <TextField
          label={editing ? copy.editLabel : copy.keyword}
          autoComplete="off"
          required
          maxLength={120}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          disabled={save.isPending}
          error={duplicate ? copy.duplicate : undefined}
        />
        <AdminButton variant="primary" type="submit" disabled={save.isPending || !keyword.trim()}>
          {editing ? copy.save : copy.add}
        </AdminButton>
        {editing && (
          <AdminButton disabled={save.isPending} onClick={() => { save.reset(); setEditing(null); setKeyword(''); }}>
            {copy.cancel}
          </AdminButton>
        )}
      </form>

      <AdminApiError error={query.error} retry={() => void query.refetch()} />
      <AdminApiError error={duplicate || deleting ? null : save.error} />
      {save.isSuccess && (
        <output className="block text-[13px] text-teal-ink">
          {save.variables?.action === 'delete' ? copy.deleted : copy.saved}
        </output>
      )}
      {query.isPending && <LoadingState rows={3} />}
      {query.isSuccess && !rules.length && <EmptyState title={copy.empty} />}
      {rules.length > 0 && (
        <ul className="divide-y divide-border border-y border-border" aria-label={copy.list}>
          {rules.map((rule) => (
            <li key={rule.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="break-all text-[13px]">{rule.keyword}</strong>
                  <StatusBadge tone={rule.enabled ? 'success' : 'neutral'}>
                    {rule.enabled ? copy.enabled : copy.disabled}
                  </StatusBadge>
                </div>
                <p className="text-xs text-text-muted">{copy.updated} {formatDateTime(rule.updatedAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminButton disabled={save.isPending} onClick={() => edit(rule)} aria-label={`${copy.edit} ${rule.keyword}`}>
                  {copy.edit}
                </AdminButton>
                <AdminButton
                  disabled={save.isPending}
                  onClick={() => save.mutate({ action: 'toggle', id: rule.id, enabled: !rule.enabled })}
                  aria-label={`${rule.enabled ? copy.turnOff : copy.turnOn} ${rule.keyword}`}
                >
                  {rule.enabled ? copy.turnOff : copy.turnOn}
                </AdminButton>
                <AdminButton
                  variant="danger"
                  disabled={save.isPending}
                  onClick={() => {
                    save.reset();
                    setDeleting(rule);
                  }}
                  aria-label={`${copy.delete} ${rule.keyword}`}
                >
                  {copy.delete}
                </AdminButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      {deleting && (
        <ConfirmDialog
          title={copy.deleteTitle}
          description={t('moderationConsole.keywordRules.deleteDescription', { keyword: deleting.keyword })}
          confirmLabel={copy.delete}
          tone="danger"
          isPending={save.isPending}
          onClose={() => {
            save.reset();
            setDeleting(null);
          }}
          onConfirm={() => save.mutate({ action: 'delete', id: deleting.id })}
        >
          <AdminApiError error={save.error} />
        </ConfirmDialog>
      )}
      <section aria-labelledby="moderation-built-in-rules" className="space-y-2 border-t border-border pt-4">
        <h2 id="moderation-built-in-rules" className="text-sm font-semibold">{copy.builtInHeading}</h2>
        <p className="text-[13px] text-text-muted">{copy.builtInHint}</p>
        <AdminApiError error={builtIn.error} retry={() => void builtIn.refetch()} />
        {builtIn.isPending && <LoadingState rows={3} />}
        {builtIn.isSuccess && !builtIn.data.length && <EmptyState title={copy.builtInEmpty} />}
        {builtIn.data?.map((rule) => (
          <details key={rule.code} className="rounded-lg border border-border px-3 py-2">
            <summary className="cursor-pointer text-[13px] font-medium">{builtInLabels[rule.code] ?? rule.code}</summary>
            <p className="mt-2 text-xs text-text-muted">{copy.patternHint}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {rule.patterns.map((pattern) => (
                <li key={pattern} className="min-w-0 max-w-full rounded border border-border px-2 py-1">
                  <code className="break-all text-xs">{pattern}</code>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>
    </div>
  );
}

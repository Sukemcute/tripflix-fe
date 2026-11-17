'use client';
import { vi } from '@tripflix/i18n';
import { cn } from '@tripflix/ui-web';
import Link from 'next/link';
import { AdminApiError } from '../shell/api-state';
import { Icon } from '../ui/icon';
import { Badge, Card, EmptyState, PageHeader, Skeleton, type Tone } from '../ui/primitives';
import { LiveIndicator } from './live-indicator';
import { useOpsAlerts, type AlertSeverity, type OpsAlert } from './ops-alerts';

const text = vi.adminConsole.alerts;
export const ALERT_TONE: Record<AlertSeverity, Tone> = { critical: 'danger', warning: 'sun', info: 'navy' };

export function AlertRow({ alert, isCompact = false }: { alert: OpsAlert; isCompact?: boolean }) {
  const tone = ALERT_TONE[alert.severity];
  return (
    <li>
      <Link
        href={alert.href}
        className={cn(
          'group flex items-start gap-3 rounded-xl border border-transparent transition-colors hover:border-border hover:bg-surface',
          isCompact ? 'px-3 py-2.5' : 'px-4 py-3.5',
        )}
      >
        <span
          className={cn(
            'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg',
            tone === 'danger' && 'bg-danger/10 text-danger',
            tone === 'sun' && 'bg-sun-soft text-ink',
            tone === 'navy' && 'bg-navy/5 text-navy',
          )}
        >
          <Icon name={alert.icon} size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <strong className="text-sm font-semibold text-text">{alert.title}</strong>
            {!isCompact && <Badge tone={tone}>{text.severity[alert.severity]}</Badge>}
          </span>
          <span className="mt-0.5 block text-xs text-text-muted">{alert.body}</span>
        </span>
        <span className="mt-1 hidden items-center gap-1 text-xs font-semibold text-teal-ink group-hover:flex">
          {text.action}
          <Icon name="chevronRight" size={14} />
        </span>
      </Link>
    </li>
  );
}

export function OpsAlertsPage() {
  const { alerts, isLoading, errors } = useOpsAlerts();
  const counts = {
    critical: alerts.filter((alert) => alert.severity === 'critical').length,
    warning: alerts.filter((alert) => alert.severity === 'warning').length,
    info: alerts.filter((alert) => alert.severity === 'info').length,
  };
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={text.title} subtitle={text.subtitle} actions={<LiveIndicator />} />
      <div className="grid gap-3 sm:grid-cols-3">
        {(['critical', 'warning', 'info'] as const).map((severity) => (
          <Card key={severity} className="flex items-center justify-between px-5 py-4">
            <Badge tone={ALERT_TONE[severity]} hasDot>
              {text.severity[severity]}
            </Badge>
            <strong className="text-2xl font-bold tabular-nums">{isLoading ? '…' : counts[severity]}</strong>
          </Card>
        ))}
      </div>
      {errors.map((error, index) => (
        <AdminApiError key={index} error={error} />
      ))}
      <Card aria-label={text.title}>
        {isLoading ? (
          <div className="flex flex-col gap-3 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : alerts.length ? (
          <ul className="flex flex-col gap-1 p-2">
            {alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </ul>
        ) : (
          <EmptyState icon="check" title={text.none} />
        )}
      </Card>
    </div>
  );
}

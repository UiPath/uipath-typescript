import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { useCases } from '@/hooks/useCases';
import { getSlaSummaryAll } from '@/lib/sdk';
import { slaCounts, slaUrgency } from '@/lib/metrics';
import { getRecentCases } from '@/lib/recent';
import { Card, Kpi, PageHeader, Button, Loading, ErrorState, Spinner, SlaBadge } from '@/components/ui';
import { formatDate, relativeTime } from '@/lib/format';
import { ActionsIcon, AnalyticsIcon, CasesIcon, ChevronRight, AlertIcon, ClockIcon } from '@/components/icons';
import type { CaseSla } from '@/lib/types';

function bar(value: number, total: number, color: string) {
  const pct = total ? (value / total) * 100 : 0;
  return <div className="h-full" style={{ width: `${pct}%`, background: color }} />;
}

function StatRow({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
        {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function Dashboard() {
  const { sdk } = useAuth();
  const { caseDefinition: def, caseProcessKey, loading, error, refresh } = useCases();
  const navigate = useNavigate();

  // SLA summary: a single lazy aggregate query, scoped to this case's instances.
  const slaQ = useAsync(() => getSlaSummaryAll(sdk).catch(() => [] as CaseSla[]), []);
  const slaRows = useMemo(
    () => (slaQ.data ?? []).filter((r) => r.processKey === caseProcessKey),
    [slaQ.data, caseProcessKey],
  );
  const sla = useMemo(() => slaCounts(slaRows), [slaRows]);
  const attention = useMemo(
    () =>
      slaRows
        .filter((r) => r.slaStatus === 'breached' || r.slaStatus === 'at-risk')
        .sort((a, b) => slaUrgency(b) - slaUrgency(a)),
    [slaRows],
  );

  const recents = getRecentCases();

  if (loading) return <Loading label="Loading case…" />;
  if (error || !def)
    return (
      <div className="p-7">
        <ErrorState message={error ?? 'Case not found.'} />
      </div>
    );

  const running = def.runningCount + (def.retryingCount ?? 0);
  const active = running + def.pendingCount + def.pausedCount;
  const total = active + def.completedCount + def.faultedCount + def.cancelledCount;

  const open = (folderKey: string, instanceId: string) =>
    navigate(`/cases/${encodeURIComponent(folderKey)}/${encodeURIComponent(instanceId)}`);

  return (
    <div className="p-7">
      <PageHeader
        title={def.name}
        subtitle={`${def.folderName} · ${total} instance${total === 1 ? '' : 's'}`}
        right={
          <>
            <Button variant="default" onClick={() => navigate('/cases')}>
              <CasesIcon width={16} height={16} /> Instances
            </Button>
            <Button variant="default" onClick={() => navigate('/actions')}>
              <ActionsIcon width={16} height={16} /> Actions
            </Button>
            <Button variant="default" onClick={() => navigate('/analytics')}>
              <AnalyticsIcon width={16} height={16} /> Analytics
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Active" value={active} tone="blue" />
        <Kpi label="Running" value={running} />
        <Kpi label="Faulted" value={def.faultedCount} tone={def.faultedCount ? 'red' : undefined} />
        <Kpi label="Completed" value={def.completedCount} tone="green" />
        <Kpi
          label="SLA overdue"
          value={slaQ.loading ? '…' : slaRows.length ? sla.breached : '—'}
          tone={sla.breached ? 'red' : undefined}
        />
        <Kpi
          label="SLA compliance"
          value={sla.compliance === null ? '—' : `${Math.round(sla.compliance)}%`}
          tone={sla.compliance !== null && sla.compliance < 90 ? 'amber' : 'green'}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {/* Instance status breakdown (from the case definition's live counts) */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Instance status</h2>
              <Button variant="ghost" onClick={refresh}>
                Refresh
              </Button>
            </div>
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted">
              {bar(def.completedCount, total, '#10b981')}
              {bar(running, total, '#3b82f6')}
              {bar(def.pausedCount, total, '#f59e0b')}
              {bar(def.faultedCount, total, '#ef4444')}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-3">
              <StatRow label="Running" value={running} dot="#3b82f6" />
              <StatRow label="Completed" value={def.completedCount} dot="#10b981" />
              <StatRow label="Faulted" value={def.faultedCount} dot="#ef4444" />
              <StatRow label="Paused" value={def.pausedCount} dot="#f59e0b" />
              <StatRow label="Pending" value={def.pendingCount} dot="#94a3b8" />
              <StatRow label="Cancelled" value={def.cancelledCount} dot="#cbd5e1" />
            </dl>
            <div className="mt-5">
              <Button variant="primary" onClick={() => navigate('/cases')}>
                View all instances
              </Button>
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
              <AlertIcon width={16} height={16} className="text-destructive" /> SLA needs attention
              {slaQ.loading && <Spinner className="ml-auto h-3.5 w-3.5" />}
            </div>
            {!slaQ.loading && slaRows.length === 0 && (
              <p className="text-sm text-muted-foreground">SLA insights unavailable for this tenant.</p>
            )}
            {!slaQ.loading && slaRows.length > 0 && attention.length === 0 && (
              <p className="text-sm text-muted-foreground">All instances on track.</p>
            )}
            <div className="space-y-2">
              {attention.slice(0, 6).map((r) => (
                <button
                  key={r.caseInstanceId}
                  onClick={() => r.folderKey && open(r.folderKey, r.caseInstanceId)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border p-2.5 text-left hover:bg-muted"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{r.name || 'Case'}</span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <ClockIcon width={12} height={12} /> due {formatDate(r.slaDueTime)}
                    </span>
                  </span>
                  <SlaBadge status={r.slaStatus} />
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-2 text-[13px] font-semibold">Recently viewed</div>
            {recents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Instances you open will appear here.</p>
            ) : (
              <ul className="space-y-1">
                {recents.map((r) => (
                  <li key={r.instanceId}>
                    <button
                      onClick={() => open(r.folderKey, r.instanceId)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-muted"
                    >
                      <span className="truncate font-medium text-primary">{r.label}</span>
                      <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                        {relativeTime(new Date(r.at).toISOString())}
                        <ChevronRight width={12} height={12} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

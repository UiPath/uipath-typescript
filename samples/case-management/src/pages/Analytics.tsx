import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { useCases } from '@/hooks/useCases';
import {
  insightsTopElementFailed,
  insightsTopRunCount,
  insightsTopFaultedCount,
  insightsTopDuration,
  insightsStatusTimeline,
  insightsElementStats,
  getSlaSummaryAll,
  sanitizeElementName,
  listCaseInstancesPage,
} from '@/lib/sdk';
import { tenantMetrics, slaCounts } from '@/lib/metrics';
import { Card, PageHeader, Loading, ErrorState, Kpi, Badge } from '@/components/ui';
import { Skeleton } from '@uipath/apollo-wind/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@uipath/apollo-wind/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@uipath/apollo-wind/components/ui/chart';
import type { CaseSla, TopElementFailed, ElementStat } from '@/lib/types';

interface Datum {
  label: string;
  value: number;
  color: string;
}

// Semantic data-viz palette (works in light + dark).
const C = { blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', red: '#ef4444', rose: '#f43f5e', slate: '#94a3b8', mute: '#cbd5e1' };

const CHART_CONFIG: ChartConfig = { value: { label: 'Count' } };

function fmtMs(ms: number): string {
  if (!ms || ms < 0) return '—';
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`;
  const m = s / 60;
  if (m < 60) return `${Math.round(m)}m`;
  const h = m / 60;
  return `${h.toFixed(1)}h`;
}

/** Horizontal bar chart (apollo-wind ChartContainer + recharts) with per-bar colors. */
function BarChartCard({ data, loading, format }: { data: Datum[]; loading?: boolean; format?: (n: number) => string }) {
  const height = Math.max(150, data.length * 46);
  if (loading) return <Skeleton className="w-full rounded-lg" style={{ height }} />;
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground" style={{ minHeight: 120 }}>
        No data for this period
      </div>
    );
  }
  return (
    <ChartContainer config={CHART_CONFIG} className="w-full" style={{ height }}>
      <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 4, right: 44, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={140} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
        <ChartTooltip
          cursor={{ fill: 'var(--color-muted)', fillOpacity: 0.4 }}
          content={<ChartTooltipContent hideIndicator formatter={(v) => (format ? format(Number(v)) : String(v))} />}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={26}>
          {data.map((d, i) => (
            <Cell key={`${d.label}-${i}`} fill={d.color} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            fill="var(--color-foreground)"
            fontSize={12}
            fontWeight={600}
            formatter={(v: number) => (format ? format(v) : v)}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

const TIMELINE_CONFIG: ChartConfig = {
  Completed: { label: 'Completed', color: C.green },
  Faulted: { label: 'Faulted', color: C.red },
  Cancelled: { label: 'Cancelled', color: C.slate },
};

interface TimelinePoint {
  date: string;
  ts: number;
  Completed: number;
  Faulted: number;
  Cancelled: number;
}

export function Analytics() {
  const { sdk } = useAuth();
  const { definitions, caseProcessKey, caseDefinition, loading: casesLoading, error: casesError } = useCases();

  const range = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 3600 * 1000);
    return { start, end };
  }, []);

  // --- Insights queries (RTM; each degrades gracefully if unprovisioned) ---
  const failing = useAsync(async () => {
    try {
      return { available: true, rows: await insightsTopElementFailed(sdk, range.start, range.end, caseProcessKey) };
    } catch {
      return { available: false, rows: [] as TopElementFailed[] };
    }
  }, [caseProcessKey, range]);

  const slaQ = useAsync(() => getSlaSummaryAll(sdk).catch(() => [] as CaseSla[]), []);

  const timeline = useAsync(
    () => insightsStatusTimeline(sdk, range.start, range.end).catch(() => []),
    [range],
  );

  const topRuns = useAsync(() => insightsTopRunCount(sdk, range.start, range.end).catch(() => []), [range]);
  const topFaults = useAsync(() => insightsTopFaultedCount(sdk, range.start, range.end).catch(() => []), [range]);
  const topDuration = useAsync(() => insightsTopDuration(sdk, range.start, range.end).catch(() => []), [range]);

  // Resolve the package id + version from a RECENT instance of this case — the
  // version that actually executed (the definition's packageVersions[0] is often
  // an older version with no stats in the window).
  const pkg = useAsync(async () => {
    const page = await listCaseInstancesPage(sdk, { pageSize: 20, processKey: caseProcessKey }).catch(() => null);
    const inst = page?.items?.[0];
    return {
      packageId: inst?.packageId || caseDefinition?.packageId || '',
      packageVersion: inst?.packageVersion || caseDefinition?.packageVersions?.[0] || '',
    };
  }, [caseProcessKey, caseDefinition?.packageId]);

  const elementStats = useAsync(async () => {
    const p = pkg.data;
    if (!p) return { rows: [] as ElementStat[], reason: 'pending' as const, version: '' };
    if (!p.packageId || !p.packageVersion) return { rows: [] as ElementStat[], reason: 'no-version' as const, version: '' };
    try {
      const rows = await insightsElementStats(sdk, caseProcessKey, p.packageId, p.packageVersion, range.start, range.end);
      return { rows, reason: rows.length ? ('ok' as const) : ('empty' as const), version: p.packageVersion };
    } catch (e) {
      console.warn('getElementStats failed', { processKey: caseProcessKey, ...p }, e);
      return { rows: [] as ElementStat[], reason: 'error' as const, version: p.packageVersion };
    }
  }, [pkg.data, caseProcessKey, range]);

  // --- Derived datasets ---
  const scopedSla = useMemo(
    () => (slaQ.data ?? []).filter((r) => r.processKey === caseProcessKey),
    [slaQ.data, caseProcessKey],
  );
  const metrics = useMemo(() => tenantMetrics(definitions), [definitions]);
  const sla = useMemo(() => slaCounts(scopedSla), [scopedSla]);

  const byStatus = useMemo<Datum[]>(
    () => [
      { label: 'Active', value: metrics.active, color: C.blue },
      { label: 'Completed', value: metrics.completed, color: C.green },
      { label: 'Faulted', value: metrics.faulted, color: C.red },
      { label: 'Paused', value: metrics.paused, color: C.amber },
    ],
    [metrics],
  );
  const slaDist = useMemo<Datum[]>(
    () => [
      { label: 'On track', value: sla.onTrack, color: C.green },
      { label: 'At risk', value: sla.atRisk, color: C.amber },
      { label: 'Overdue', value: sla.breached, color: C.red },
    ],
    [sla],
  );
  const failingSteps = useMemo<Datum[]>(
    () => (failing.data?.rows ?? []).slice(0, 8).map((r) => ({ label: r.elementName, value: r.failedCount, color: C.rose })),
    [failing.data],
  );

  // Tenant comparison — highlight THIS case among all case processes.
  const hl = (key: string) => (key === caseProcessKey ? C.blue : C.mute);
  const runsData = useMemo<Datum[]>(
    () => (topRuns.data ?? []).slice(0, 6).map((r) => ({ label: r.name || r.processKey, value: r.runCount, color: hl(r.processKey) })),
    [topRuns.data, caseProcessKey],
  );
  const faultsData = useMemo<Datum[]>(
    () => (topFaults.data ?? []).slice(0, 6).map((r) => ({ label: r.name || r.processKey, value: r.faultedCount, color: hl(r.processKey) })),
    [topFaults.data, caseProcessKey],
  );
  const durationData = useMemo<Datum[]>(
    () => (topDuration.data ?? []).slice(0, 6).map((r) => ({ label: r.name || r.processKey, value: r.duration, color: hl(r.processKey) })),
    [topDuration.data, caseProcessKey],
  );

  const timelineData = useMemo<TimelinePoint[]>(() => {
    const byBucket = new Map<string, TimelinePoint>();
    for (const p of timeline.data ?? []) {
      const ts = new Date(p.startTime).getTime();
      const date = Number.isNaN(ts)
        ? p.startTime
        : new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const key = Number.isNaN(ts) ? p.startTime : String(ts);
      const row = byBucket.get(key) ?? { date, ts: Number.isNaN(ts) ? 0 : ts, Completed: 0, Faulted: 0, Cancelled: 0 };
      const status = String(p.status) as 'Completed' | 'Faulted' | 'Cancelled';
      if (status === 'Completed' || status === 'Faulted' || status === 'Cancelled') row[status] += p.count;
      byBucket.set(key, row);
    }
    return [...byBucket.values()].sort((a, b) => a.ts - b.ts);
  }, [timeline.data]);

  const slowestElements = useMemo(
    () => [...(elementStats.data?.rows ?? [])].sort((a, b) => b.avgDurationMs - a.avgDurationMs).slice(0, 12),
    [elementStats.data],
  );

  if (casesLoading) return <Loading label="Loading analytics…" />;
  if (casesError)
    return (
      <div className="p-7">
        <ErrorState message={casesError} />
      </div>
    );

  const insightsOn = !!failing.data?.available;

  return (
    <div className="p-7">
      <PageHeader
        title={caseDefinition ? `Analytics · ${caseDefinition.name}` : 'Analytics'}
        subtitle="Live instance metrics for this case (last 30 days)"
        right={
          <Badge tone={failing.loading ? 'gray' : insightsOn ? 'green' : 'gray'}>
            {failing.loading ? 'Loading Insights…' : insightsOn ? 'Insights RTM live' : 'Insights RTM unavailable'}
          </Badge>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total instances" value={metrics.total} />
        <Kpi label="Active" value={metrics.active} tone="blue" />
        <Kpi label="Completed" value={metrics.completed} tone="green" />
        <Kpi
          label="SLA compliance"
          value={slaQ.loading ? '…' : sla.compliance === null ? '—' : `${Math.round(sla.compliance)}%`}
          tone="green"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-[15px] font-semibold">Instances by status</h3>
          <BarChartCard data={byStatus} />
        </Card>
        <Card>
          <h3 className="mb-4 text-[15px] font-semibold">SLA distribution</h3>
          <BarChartCard data={slaDist} loading={slaQ.loading} />
        </Card>

        {/* Case instances over time — getInstanceStatusTimeline (tenant-wide) */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">Case instances over time</h3>
            <span className="text-xs text-muted-foreground">Tenant-wide · daily · last 30 days</span>
          </div>
          {timeline.loading ? (
            <Skeleton className="h-56 w-full rounded-lg" />
          ) : timelineData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No timeline data (requires Insights RTM).</p>
          ) : (
            <ChartContainer config={TIMELINE_CONFIG} className="h-64 w-full">
              <BarChart accessibilityLayer data={timelineData} margin={{ left: -16, right: 8, top: 4, bottom: 4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="Completed" stackId="a" fill={C.green} />
                <Bar dataKey="Faulted" stackId="a" fill={C.red} />
                <Bar dataKey="Cancelled" stackId="a" fill={C.slate} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </Card>

        {/* Top failing steps — getTopElementFailedCount */}
        <Card className="lg:col-span-2">
          <h3 className="mb-4 text-[15px] font-semibold">Top failing steps</h3>
          {failing.loading ? (
            <Skeleton className="h-40 w-full rounded-lg" />
          ) : insightsOn ? (
            <BarChartCard data={failingSteps} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Top failing steps require Insights Real-Time Monitoring.
            </p>
          )}
        </Card>

        {/* Step performance — getElementStats for this case's package */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">Step performance</h3>
            <span className="text-xs text-muted-foreground">Slowest steps · this case's package · last 30 days</span>
          </div>
          {elementStats.loading || pkg.loading ? (
            <Skeleton className="h-48 w-full rounded-lg" />
          ) : slowestElements.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {elementStats.data?.reason === 'error'
                ? 'Step statistics couldn’t be loaded — check that Insights Real-Time Monitoring is enabled and the app has the Insights / OR.Folders scopes.'
                : elementStats.data?.reason === 'no-version'
                  ? 'Couldn’t determine this case’s package version (no instances found), so step stats can’t be fetched.'
                  : elementStats.data?.reason === 'empty'
                    ? `No step executions recorded for package version ${elementStats.data.version} in the last 30 days.`
                    : 'No step statistics available.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Step</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                  <TableHead className="text-right">P95</TableHead>
                  <TableHead className="text-right">Success</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slowestElements.map((e) => (
                  <TableRow key={e.elementId}>
                    <TableCell className="font-medium">{sanitizeElementName(undefined, e.elementId) || e.elementId}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMs(e.avgDurationMs)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{fmtMs(e.p95DurationMs)}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{e.successCount}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{e.failCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Across the tenant — getTopRunCount / getTopFaultedCount / getTopExecutionDuration */}
        <div className="lg:col-span-2">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="text-[15px] font-semibold">Across the tenant</h3>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: C.blue }} /> this case
            </span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">Where this case ranks among all case processes (last 30 days).</p>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card>
              <h4 className="mb-3 text-[13px] font-semibold">Most runs</h4>
              <BarChartCard data={runsData} loading={topRuns.loading} />
            </Card>
            <Card>
              <h4 className="mb-3 text-[13px] font-semibold">Most faults</h4>
              <BarChartCard data={faultsData} loading={topFaults.loading} />
            </Card>
            <Card>
              <h4 className="mb-3 text-[13px] font-semibold">Longest duration</h4>
              <BarChartCard data={durationData} loading={topDuration.loading} format={fmtMs} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

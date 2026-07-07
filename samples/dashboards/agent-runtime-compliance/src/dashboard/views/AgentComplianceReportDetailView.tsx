import React from 'react'
import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DetailViewShell } from '@/dashboard/components/DetailViewShell'
import { RecordsTable, type ColumnDef } from '@/dashboard/components/RecordsTable'
import { useAuth } from '@/hooks/useAuth'
import { LoadingState, EmptyState } from '@/dashboard/components'
import { fmtTimeAgo } from '@/lib/format'
import { fetchDetailByKey } from '@/metrics/agent-compliance-report'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import type { AgentGovernanceDecisionGetResponse } from '@uipath/uipath-typescript/traces'

type Row = Record<string, unknown>

// Column keys are compile-checked against the SDK's decision type; the labels
// and formatting are presentation choices the type can't provide.
type DecisionKey = Extract<keyof AgentGovernanceDecisionGetResponse, string>

const ALLOW_COLOR = 'hsl(var(--chart-2))' // UiPath blue
const DENY_COLOR = 'hsl(var(--chart-5))'  // error red

/** Safely extract a row array from any response shape (legacy fallback / bare arrays). */
function toRows(raw: unknown): Row[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as Row[]
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    if (Array.isArray(obj.items)) return obj.items as Row[]
    if (Array.isArray(obj.data)) return obj.data as Row[]
    if (obj.data && typeof obj.data === 'object') return toRows(obj.data)
  }
  return []
}

function StatTile({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: 'bad' | 'good' }) {
  const valueClass =
    tone === 'bad' ? 'text-[hsl(var(--chart-5))]' : tone === 'good' ? 'text-[hsl(var(--chart-3))]' : 'text-foreground'
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`mt-1 text-3xl font-semibold ${valueClass}`}>{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

/** Compact single-series bar list — the honest form for 1–5 denial categories. */
function BarList({ items, color }: { items: { name: string; value: number }[]; color: string }) {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div className="space-y-2.5">
      {items.map(item => (
        <div key={item.name} className="flex items-center gap-3">
          <span className="w-44 shrink-0 truncate text-sm text-muted-foreground" title={item.name}>
            {item.name}
          </span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max((item.value / max) * 100, 4)}%`, backgroundColor: color }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

const prettyAction = (name: string): string =>
  name === 'none' ? 'Observed (audit)' : name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()

export function AgentComplianceReportDetailView() {
  const { key } = useParams<{ key: string }>()
  const { sdk, getToken } = useAuth()
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!sdk || !key) return
    setLoading(true)
    fetchDetailByKey(sdk, key, getToken)
      .then((res: unknown) => { setData(res); setLoading(false) })
      .catch((err: unknown) => { setError(err instanceof Error ? err : new Error(String(err))); setLoading(false) })
  }, [sdk, key])

  const d = (data && !Array.isArray(data)) ? (data as Record<string, unknown[]>) : { rows: toRows(data as unknown) }

  const decisions = (d.rows ?? []) as Row[]
  const hookRows = (d.byOutcomeByHook ?? []) as { hook: string; Allow: number; Deny: number }[]
  const actionRows = ((d.byAction ?? []) as { name: string; value: number }[]).map(a => ({ ...a, name: prettyAction(a.name) }))
  const policyRows = (d.byPolicy ?? []) as { name: string; value: number }[]

  const evaluated = decisions.length
  const denied = hookRows.reduce((sum, h) => sum + (Number(h.Deny) || 0), 0)
  const agentName = String(decisions[0]?.agentName ?? '')
  const startedRaw = decisions.map(r => String(r.startTime ?? '')).filter(Boolean).sort()[0] ?? ''
  const enforced = actionRows.filter(a => a.name !== 'Observed (audit)')
  const outcome = denied === 0 ? 'Passed' : enforced.length > 0 ? enforced[0].name : 'Audit only'
  const runId = key ? decodeURIComponent(key) : ''

  const heading = agentName ? `Compliance Report — ${agentName}` : 'Run Compliance Report'
  const description = runId
    ? `Run ${runId}${startedRaw ? ` · started ${fmtTimeAgo(startedRaw)}` : ''}`
    : 'Per-run governance report'

  if (loading) return (
    <DetailViewShell title="Run Compliance Report" description="Loading run governance report…">
      <LoadingState height="h-96" />
    </DetailViewShell>
  )
  if (error) return (
    <DetailViewShell title="Run Compliance Report" description={description}>
      <EmptyState message={error.message} />
    </DetailViewShell>
  )
  if (evaluated === 0) return (
    <DetailViewShell title={heading} description={description}>
      <EmptyState message="No governance decisions found for this run in the last 30 days." />
    </DetailViewShell>
  )

  const decisionColumns: (ColumnDef<Row> & { key: DecisionKey })[] = [
    { key: 'hook', label: 'Hook' },
    { key: 'policyId', label: 'Guardrail' },
    { key: 'policyName', label: 'Clause' },
    { key: 'packName', label: 'Pack' },
    { key: 'mode', label: 'Mode' },
    { key: 'evaluatorResult', label: 'Result' },
    { key: 'actionApplied', label: 'Action' },
    { key: 'reason', label: 'Reason' },
    { key: 'startTime', label: 'Started', render: (v: unknown) => fmtTimeAgo(String(v)) },
    { key: 'endTime', label: 'Ended', render: (v: unknown) => fmtTimeAgo(String(v)) },
  ]

  return (
    <DetailViewShell title={heading} description={description}>
      <div className="space-y-6">
        {/* Run summary */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Checks evaluated" value={evaluated} sub={`across ${hookRows.length} lifecycle hook${hookRows.length === 1 ? '' : 's'}`} />
          <StatTile
            label="Failed checks"
            value={denied}
            sub={evaluated > 0 ? `${Math.round((denied / evaluated) * 100)}% of checks denied` : undefined}
            tone={denied > 0 ? 'bad' : 'good'}
          />
          <StatTile label="Run outcome" value={outcome} tone={denied === 0 ? 'good' : 'bad'} sub={denied === 0 ? 'no failed checks' : 'strictest action applied'} />
          <StatTile label="Agent" value={<span className="text-xl leading-9">{agentName || '—'}</span>} sub={startedRaw ? `started ${fmtTimeAgo(startedRaw)}` : undefined} />
        </div>

        {/* Checks by hook + denial breakdown */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Checks by Lifecycle Hook</CardTitle>
              <CardDescription>Allowed vs denied at each governance checkpoint</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(140, hookRows.length * 52 + 56)}>
                <BarChart data={hookRows} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="hook" width={118} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Allow" stackId="checks" fill={ALLOW_COLOR} barSize={16} stroke="hsl(var(--background))" strokeWidth={2} />
                  <Bar dataKey="Deny" stackId="checks" fill={DENY_COLOR} barSize={16} radius={[0, 4, 4, 0]} stroke="hsl(var(--background))" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Failed Checks Breakdown</CardTitle>
              <CardDescription>What was denied on this run, and how it was handled</CardDescription>
            </CardHeader>
            <CardContent>
              {denied === 0 ? (
                <EmptyState message="No failed checks on this run — every check passed." />
              ) : (
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">By enforcement action</p>
                    <BarList items={actionRows} color={DENY_COLOR} />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">By clause</p>
                    <BarList items={policyRows} color={DENY_COLOR} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Full decision log */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">All Decisions</CardTitle>
            <CardDescription>Every governance check this run went through</CardDescription>
          </CardHeader>
          <CardContent>
            <RecordsTable rows={decisions} columns={decisionColumns} defaultSortKey="startTime" defaultSortAsc={true} />
          </CardContent>
        </Card>
      </div>
    </DetailViewShell>
  )
}

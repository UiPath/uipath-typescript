import React from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity } from 'lucide-react'
import { useWidgetData } from '@/hooks/useWidgetData'
import { fetchData } from '@/metrics/enforcement-outcomes'


import { ViewAllLink, LoadingState, EmptyState } from '@/dashboard/components'
import { SegmentedToggle } from '@/dashboard/components/SegmentedToggle'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { fmtNumber } from '@/lib/format'
import { headline } from '@/lib/widget'
import { rangeWindow, RANGE_LABELS, type RangeKey } from '@/lib/time'

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))']

// Semantic status colors: allowed = green, denied = red, observed/audit = amber
const OUTCOME_COLORS: Record<string, string> = {
  'Allowed': 'hsl(var(--chart-3))',
  'Denied (enforced)': 'hsl(var(--chart-5))',
  'Observed only (audit)': 'hsl(var(--chart-4))',
}
const colorFor = (name: string, i: number) => OUTCOME_COLORS[name] ?? CHART_COLORS[i % CHART_COLORS.length]

export function EnforcementOutcomes() {
  const navigate = useNavigate()
  // Empty when the metric has no record-grain drill-down (registry noDetail):
  // the card renders non-clickable and no "View all" link is shown.
  const detailRoute = '/enforcementoutcomes'
  const [range, setRange] = useState<RangeKey>('30d')
  const { data, loading, error } = useWidgetData(
    (sdk, getToken) => fetchData(sdk, getToken, rangeWindow(range)),
    [range],
  )
  const chartData = data ?? []
  // The card frame (header + title) always renders; only the body swaps for
  // loading/error/empty. `ready` guards the headline so it isn't computed on
  // an empty array while data is still loading.
  const isEmpty = !chartData || (chartData as unknown[]).length === 0
  const ready = !loading && !error && !isEmpty
  const head = ready ? fmtNumber(headline(chartData as Record<string, unknown>[], 'value', 'sum')) : null

  return (
    <Card
      className={detailRoute ? 'cursor-pointer hover:shadow-md transition-shadow' : undefined}
      onClick={detailRoute ? () => navigate(detailRoute) : undefined}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-md bg-muted p-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-base">Enforcement Outcomes</CardTitle>
            <CardDescription>All rule evaluations — {RANGE_LABELS[range]}</CardDescription>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <SegmentedToggle options={['24h', '7d', '30d'] as const} value={range} onChange={setRange} />
          {detailRoute ? <ViewAllLink to={detailRoute} /> : null}
        </div>
      </CardHeader>
      {ready && (
        <div className="px-6 pb-2">
          <span className="text-3xl font-semibold">{head}</span>
          <span className="ml-2 text-sm text-muted-foreground">evaluations</span>
        </div>
      )}
      <CardContent className="pt-0">
        {loading ? (
          <LoadingState height="h-[180px]" />
        ) : error ? (
          <EmptyState message={error.message} />
        ) : isEmpty ? (
          <EmptyState message="No data" />
        ) : (() => {
          const rows = chartData as { name: string; value: number }[]
          const total = rows.reduce((sum, row) => sum + Number(row.value || 0), 0)
          return (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              <div className="h-[180px] w-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={rows} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75}>
                      {rows.map((row, i) => (
                        <Cell key={i} fill={colorFor(String(row.name), i)} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full min-w-0 flex-1 space-y-2.5">
                {rows.map((row, i) => {
                  const value = Number(row.value || 0)
                  const pct = total > 0 ? Math.round((value / total) * 1000) / 10 : 0
                  return (
                    <div key={String(row.name)} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: colorFor(String(row.name), i) }}
                      />
                      <span className="truncate text-muted-foreground">{String(row.name)}</span>
                      <span className="ml-auto font-medium tabular-nums">{fmtNumber(value)}</span>
                      <span className="w-14 text-right text-xs text-muted-foreground tabular-nums">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}

import React from 'react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WidgetBoundary } from '@/dashboard/chrome/WidgetBoundary'
import { LoadingState, EmptyState, DeltaBadge, ViewAllLink } from '@/dashboard/chrome'
import { RecordsTable, type ColumnDef } from '@/dashboard/chrome/RecordsTable'
import { fmtNumber, fmtPercent, fmtDuration, fmtTimeAgo } from '@/lib/format'
import { toneClass, kpiDelta, type DeltaPolarity } from '@/lib/widget'
import { ShieldAlert } from 'lucide-react'
import { fetchData } from '@/metrics/agents-by-violations'
import { SegmentedToggle } from '@/dashboard/chrome/SegmentedToggle'
import { rangeWindow, RANGE_LABELS, type RangeKey } from '@/lib/time'

type TopNKey = '5' | '10' | '20'

type Row = Record<string, unknown>

const DISPLAY_AS: string = 'ranked-table'
const VALUE_FIELD = ''
const VALUE_LABEL = ''
const PREVIOUS_FIELD = ''
const DELTA_POLARITY = 'neutral'
const ROW_LINK_KEY = 'name'
const ROW_LINK_ROUTE = '/agentsbyviolations'
// Set only for a kpi-card with detail:true — makes the card clickable and adds a
// "View all" link to its record-grain detail view. Empty for plain KPIs and tables.
const KPI_DETAIL_ROUTE = ''
const COLUMNS: ColumnDef<Row>[] = [{key:"name",label:"Agent"},{key:"value",label:"Failed Checks",align:"right" as const,render:(v:unknown)=>fmtNumber(Number(v))}]

/** Auto-detect columns from the first row when explicit columns aren't given. */
function autoColumns(rows: Row[]): ColumnDef<Row>[] {
  if (rows.length === 0) return [{ key: 'value', label: 'Value' }]
  return Object.entries(rows[0])
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
    .map(([k, v]) => ({
      key: k,
      label: k.replace(/([A-Z])/g, ' $1').replace(/^(.)/, (s: string) => s.toUpperCase()).trim(),
      ...(typeof v === 'number' && { align: 'right' as const }),
    }))
}

function useAgentsByViolationsData(range: RangeKey, topN: TopNKey) {
  const { sdk, getToken } = useAuth()
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!sdk) return
    setLoading(true)
    setError(null)
    fetchData(sdk, getToken, { ...rangeWindow(range), limit: Number(topN) })
      .then(rows => { setData(rows); setLoading(false) })
      .catch(err => { setError(err instanceof Error ? err : new Error(String(err))); setLoading(false) })
  }, [sdk, range, topN])

  return { data, loading, error }
}

export function AgentsByViolations() {
  const navigate = useNavigate()
  const [range, setRange] = useState<RangeKey>('30d')
  const [topN, setTopN] = useState<TopNKey>('20')
  const { data, loading, error } = useAgentsByViolationsData(range, topN)

  const renderContent = () => {
    if (loading) return <LoadingState height="h-32" />
    if (error)   return <EmptyState message={error.message} />
    if (data.length === 0) return <EmptyState message="No failed checks in this window — all checks are passing." />

    if (DISPLAY_AS === 'ranked-table' || DISPLAY_AS === 'data-table') {
      const cols = COLUMNS.length ? COLUMNS : autoColumns(data)
      return (
        <RecordsTable
          rows={data}
          columns={cols}
          defaultSortKey={cols[0]?.key as string}
          defaultSortAsc={false}
          {...(ROW_LINK_KEY ? { onRowClick: (row: Row) => navigate(`${ROW_LINK_ROUTE}/${encodeURIComponent(String(row[ROW_LINK_KEY] ?? ''))}`) } : {})}
        />
      )
    }

    // kpi-card: show a specific field value or item count, with an optional
    // vs-previous-period delta badge when the metric returns a `previous` field.
    const headline = VALUE_FIELD
      ? String((data[0] as Record<string, unknown>)?.[VALUE_FIELD] ?? '—')
      : String(data.length)
    const label = VALUE_LABEL || (VALUE_FIELD ? VALUE_FIELD : `${data.length === 1 ? 'item' : 'items'}`)
    const cur = VALUE_FIELD ? Number((data[0] as Record<string, unknown>)?.[VALUE_FIELD]) : data.length
    const prevRaw = PREVIOUS_FIELD ? (data[0] as Record<string, unknown>)?.[PREVIOUS_FIELD] : undefined
    const kd = (PREVIOUS_FIELD && prevRaw !== undefined && prevRaw !== null)
      ? kpiDelta(cur, Number(prevRaw), DELTA_POLARITY as DeltaPolarity)
      : null

    return (
      <div className="flex flex-col gap-1 py-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-foreground">{headline}</span>
          {kd && kd.text && <DeltaBadge direction={kd.direction} text={kd.text} />}
        </div>
        {label && <span className="text-sm text-muted-foreground">{label}</span>}
      </div>
    )
  }

  return (
    <WidgetBoundary label="Agents by Failed Checks">
      <Card
        className={KPI_DETAIL_ROUTE ? 'cursor-pointer hover:shadow-md transition-shadow' : undefined}
        onClick={KPI_DETAIL_ROUTE ? () => navigate(KPI_DETAIL_ROUTE) : undefined}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldAlert className="h-4 w-4" />
              Agents by Failed Checks
            </CardTitle>
            <CardDescription>Agents ranked by failed compliance checks — {RANGE_LABELS[range]}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <SegmentedToggle
              options={['5', '10', '20'] as const}
              value={topN}
              onChange={setTopN}
              labels={{ '5': 'Top 5', '10': 'Top 10', '20': 'Top 20' }}
            />
            <SegmentedToggle options={['24h', '7d', '30d'] as const} value={range} onChange={setRange} />
            {KPI_DETAIL_ROUTE ? <ViewAllLink to={KPI_DETAIL_ROUTE} /> : null}
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </WidgetBoundary>
  )
}

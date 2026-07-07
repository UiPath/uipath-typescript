import React from 'react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WidgetBoundary } from '@/dashboard/chrome/WidgetBoundary'
import { LoadingState, EmptyState } from '@/dashboard/chrome'
import { RecordsTable, type ColumnDef } from '@/dashboard/chrome/RecordsTable'
import { fmtNumber } from '@/lib/format'
import { ShieldAlert } from 'lucide-react'
import { fetchData } from '@/metrics/agents-by-violations'
import { SegmentedToggle } from '@/dashboard/chrome/SegmentedToggle'
import { rangeWindow, RANGE_LABELS, type RangeKey } from '@/lib/time'

type TopNKey = '5' | '10' | '20'

type Row = Record<string, unknown>

const ROW_LINK_KEY = 'name'
const ROW_LINK_ROUTE = '/agentsbyviolations'
const COLUMNS: ColumnDef<Row>[] = [{key:"name",label:"Agent"},{key:"value",label:"Failed Checks",align:"right" as const,render:(v:unknown)=>fmtNumber(Number(v))}]

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

    return (
      <RecordsTable
        rows={data}
        columns={COLUMNS}
        defaultSortKey={COLUMNS[0]?.key as string}
        defaultSortAsc={false}
        onRowClick={(row: Row) => navigate(`${ROW_LINK_ROUTE}/${encodeURIComponent(String(row[ROW_LINK_KEY] ?? ''))}`)}
      />
    )
  }

  return (
    <WidgetBoundary label="Agents by Failed Checks">
      <Card>
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
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </WidgetBoundary>
  )
}

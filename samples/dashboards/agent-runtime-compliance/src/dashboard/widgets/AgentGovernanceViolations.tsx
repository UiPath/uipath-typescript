import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WidgetBoundary } from '@/dashboard/components/WidgetBoundary'
import { LoadingState, EmptyState, DeltaBadge, ViewAllLink } from '@/dashboard/components'
import { useWidgetData } from '@/hooks/useWidgetData'
import { kpiDelta, type DeltaPolarity } from '@/lib/widget'
import { ShieldAlert } from 'lucide-react'
import { fetchData } from '@/metrics/agent-governance-violations'
import { rangeWindow, RANGE_LABELS, type RangeKey } from '@/lib/time'

type Row = Record<string, unknown>

const VALUE_FIELD = 'value'
const VALUE_LABEL = 'failed checks'
const PREVIOUS_FIELD = 'previous'
const DELTA_POLARITY: DeltaPolarity = 'up-bad'
// The card is clickable and links to its record-grain detail view.
const DETAIL_ROUTE = '/agentgovernanceviolations'

export function AgentGovernanceViolations({ range = '30d' }: { range?: RangeKey }) {
  const navigate = useNavigate()
  const { data, loading, error } = useWidgetData<Row[]>(
    (sdk, getToken) => fetchData(sdk, getToken, rangeWindow(range)),
    [range],
  )
  const rows = data ?? []

  const renderContent = () => {
    if (loading) return <LoadingState height="h-32" />
    if (error)   return <EmptyState message={error.message} />
    if (rows.length === 0) return <EmptyState message="No failed checks in this window — all checks are passing." />

    // kpi-card: headline value with a vs-previous-period delta badge
    // (rendered when the metric returns a `previous` field).
    const first = rows[0]
    const headline = String(first?.[VALUE_FIELD] ?? '—')
    const current = Number(first?.[VALUE_FIELD])
    const previousRaw = first?.[PREVIOUS_FIELD]
    const delta = (previousRaw !== undefined && previousRaw !== null)
      ? kpiDelta(current, Number(previousRaw), DELTA_POLARITY)
      : null

    return (
      <div className="flex flex-col gap-1 py-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-foreground">{headline}</span>
          {delta && delta.text && <DeltaBadge direction={delta.direction} text={delta.text} />}
        </div>
        <span className="text-sm text-muted-foreground">{VALUE_LABEL}</span>
      </div>
    )
  }

  return (
    <WidgetBoundary label="Failed Compliance Checks">
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate(DETAIL_ROUTE)}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldAlert className="h-4 w-4" />
              Failed Compliance Checks
            </CardTitle>
            <CardDescription>Deny verdicts from UiPath compliance checks — {RANGE_LABELS[range]}</CardDescription>
          </div>
          <ViewAllLink to={DETAIL_ROUTE} />
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </WidgetBoundary>
  )
}

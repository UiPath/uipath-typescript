import React from 'react'
import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { DetailViewShell } from '@/dashboard/chrome/DetailViewShell'
import { RecordsTable, type ColumnDef } from '@/dashboard/chrome/RecordsTable'
import { useAuth } from '@/hooks/useAuth'
import { LoadingState, EmptyState } from '@/dashboard/chrome'
import { fmtNumber, fmtPercent, fmtDuration, fmtTimeAgo } from '@/lib/format'
import { toneClass } from '@/lib/widget'
import { fetchDetailByKey } from '@/metrics/agents-by-violations'

type Row = Record<string, unknown>

/** Auto-detect columns from the first row when explicit detailColumns aren't given. */
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

export function AgentsByViolationsDetailView() {
  const { key } = useParams<{ key: string }>()
  const { sdk, getToken } = useAuth()
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!sdk || !key) return
    setLoading(true)
    fetchDetailByKey(sdk, key, getToken)
      .then((rows: Row[]) => { setData(rows); setLoading(false) })
      .catch((err: unknown) => { setError(err instanceof Error ? err : new Error(String(err))); setLoading(false) })
  }, [sdk, key])

  const rows = data
  const columns = [{key:"agentName",label:"Agent"},{key:"policyId",label:"Guardrail"},{key:"policyName",label:"Clause"},{key:"packName",label:"Pack"},{key:"hook",label:"Hook"},{key:"mode",label:"Mode"},{key:"evaluatorResult",label:"Result"},{key:"actionApplied",label:"Action"},{key:"reason",label:"Reason"},{key:"traceId",label:"Run (Trace ID)"},{key:"jobKey",label:"Job Key"},{key:"folderKey",label:"Folder Key"},{key:"source",label:"Source"},{key:"startTime",label:"Started",render:(v:unknown)=>fmtTimeAgo(String(v))},{key:"endTime",label:"Ended",render:(v:unknown)=>fmtTimeAgo(String(v))}]
  const heading = key ? `Failed Checks — ${decodeURIComponent(key)}` : 'Agents by Failed Checks'

  if (loading) return (
    <DetailViewShell title={heading} description="Failed compliance checks for this agent">
      <LoadingState height="h-96" />
    </DetailViewShell>
  )
  if (error) return (
    <DetailViewShell title={heading} description="Failed compliance checks for this agent">
      <EmptyState message={error.message} />
    </DetailViewShell>
  )
  return (
    <DetailViewShell title={heading} description="Failed compliance checks for this agent">
      <RecordsTable rows={rows} columns={columns} />
    </DetailViewShell>
  )
}

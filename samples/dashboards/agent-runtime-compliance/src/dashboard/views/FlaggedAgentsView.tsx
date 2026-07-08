import React from 'react'
import { DetailViewShell } from '@/dashboard/components/DetailViewShell'
import { RecordsTable } from '@/dashboard/components/RecordsTable'
import { useWidgetData } from '@/hooks/useWidgetData'
import { LoadingState, EmptyState } from '@/dashboard/components'
import { fmtNumber } from '@/lib/format'
import { fetchDetail } from '@/metrics/flagged-agents'

type Row = Record<string, unknown>

export function FlaggedAgentsView() {
  const { data, loading, error } = useWidgetData(fetchDetail, [])

  /** Safely extract a row array from any response shape */
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

  const rows = toRows(data ?? [])
  const columns = [{key:"name",label:"Agent"},{key:"value",label:"Failed Checks",align:"right" as const,render:(v:unknown)=>fmtNumber(Number(v))}]

  if (loading) return (
    <DetailViewShell title="Flagged Agents" description="Agents with failed compliance checks — last 30 days">
      <LoadingState height="h-96" />
    </DetailViewShell>
  )
  if (error) return (
    <DetailViewShell title="Flagged Agents" description="Last 30 days">
      <EmptyState message={error.message} />
    </DetailViewShell>
  )
  return (
    <DetailViewShell title="Flagged Agents" description="Last 30 days">
      <RecordsTable rows={rows} columns={columns} defaultSortKey={(columns[0]?.key as string)} />
    </DetailViewShell>
  )
}

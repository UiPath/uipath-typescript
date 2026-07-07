import React from 'react'
import { DetailViewShell } from '@/dashboard/chrome/DetailViewShell'
import { RecordsTable } from '@/dashboard/chrome/RecordsTable'
import { useWidgetData } from '@/hooks/useWidgetData'
import { LoadingState, EmptyState } from '@/dashboard/chrome'
import { fmtNumber } from '@/lib/format'
import { fetchDetail } from '@/metrics/policies-with-violations'

type Row = Record<string, unknown>

export function PoliciesWithViolationsView() {
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
  const columns = [{key:"name",label:"Check"},{key:"value",label:"Failed Checks",align:"right" as const,render:(v:unknown)=>fmtNumber(Number(v))}]

  if (loading) return (
    <DetailViewShell title="Checks Failing" description="Distinct compliance checks breached — last 30 days">
      <LoadingState height="h-96" />
    </DetailViewShell>
  )
  if (error) return (
    <DetailViewShell title="Checks Failing" description="Distinct compliance checks breached — last 30 days">
      <EmptyState message={error.message} />
    </DetailViewShell>
  )
  return (
    <DetailViewShell title="Checks Failing" description="Distinct compliance checks breached — last 30 days">
      <RecordsTable rows={rows} columns={columns} defaultSortKey={(columns[0]?.key as string)} />
    </DetailViewShell>
  )
}

import React from 'react'
import { DetailViewShell } from '@/dashboard/chrome/DetailViewShell'
import { RecordsTable } from '@/dashboard/chrome/RecordsTable'
import { useWidgetData } from '@/hooks/useWidgetData'
import { LoadingState, EmptyState } from '@/dashboard/chrome'
import { fmtTimeAgo } from '@/lib/format'
import { fetchDetail } from '@/metrics/agent-governance-violations'

type Row = Record<string, unknown>

export function AgentGovernanceViolationsView() {
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
  const columns = [{key:"agentName",label:"Agent"},{key:"policyId",label:"Guardrail"},{key:"policyName",label:"Clause"},{key:"packName",label:"Pack"},{key:"hook",label:"Hook"},{key:"mode",label:"Mode"},{key:"evaluatorResult",label:"Result"},{key:"actionApplied",label:"Action"},{key:"reason",label:"Reason"},{key:"traceId",label:"Run (Trace ID)"},{key:"jobKey",label:"Job Key"},{key:"folderKey",label:"Folder Key"},{key:"source",label:"Source"},{key:"startTime",label:"Started",render:(v:unknown)=>fmtTimeAgo(String(v))},{key:"endTime",label:"Ended",render:(v:unknown)=>fmtTimeAgo(String(v))}]

  if (loading) return (
    <DetailViewShell title="Failed Compliance Checks" description="Deny verdicts from UiPath compliance checks">
      <LoadingState height="h-96" />
    </DetailViewShell>
  )
  if (error) return (
    <DetailViewShell title="Failed Compliance Checks" description="Deny verdicts from UiPath compliance checks">
      <EmptyState message={error.message} />
    </DetailViewShell>
  )
  return (
    <DetailViewShell title="Failed Compliance Checks" description="Deny verdicts from UiPath compliance checks">
      <RecordsTable rows={rows} columns={columns} defaultSortKey={(columns[0]?.key as string)} />
    </DetailViewShell>
  )
}

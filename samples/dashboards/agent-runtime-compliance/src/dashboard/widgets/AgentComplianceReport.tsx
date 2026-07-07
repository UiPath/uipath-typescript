import React from 'react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WidgetBoundary } from '@/dashboard/chrome/WidgetBoundary'
import { LoadingState, EmptyState } from '@/dashboard/chrome'
import { RecordsTable, type ColumnDef } from '@/dashboard/chrome/RecordsTable'
import { fmtNumber, fmtTimeAgo } from '@/lib/format'
import { ShieldCheck } from 'lucide-react'
import { fetchData } from '@/metrics/agent-compliance-report'

type Row = Record<string, unknown>

const ROW_LINK_KEY = 'runKey'
const ROW_LINK_ROUTE = '/agentcompliancereport'
const COLUMNS: ColumnDef<Row>[] = [{key:"agentName",label:"Agent"},{key:"startTime",label:"Started",render:(v:unknown)=>fmtTimeAgo(String(v))},{key:"evaluated",label:"Evaluated",align:"right" as const,render:(v:unknown)=>fmtNumber(Number(v))},{key:"matched",label:"Matched",align:"right" as const,render:(v:unknown)=>fmtNumber(Number(v))},{key:"finalAction",label:"Action"}]

function useAgentComplianceReportData() {
  const { sdk, getToken } = useAuth()
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!sdk) return
    setLoading(true)
    fetchData(sdk, getToken)
      .then(rows => { setData(rows); setLoading(false) })
      .catch(err => { setError(err instanceof Error ? err : new Error(String(err))); setLoading(false) })
  }, [sdk])

  return { data, loading, error }
}

export function AgentComplianceReport() {
  const navigate = useNavigate()
  const { data, loading, error } = useAgentComplianceReportData()

  const renderContent = () => {
    if (loading) return <LoadingState height="h-32" />
    if (error)   return <EmptyState message={error.message} />
    if (data.length === 0) return <EmptyState message="No data" />

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
    <WidgetBoundary label="Agent Compliance by Run">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Agent Compliance by Run
            </CardTitle>
            <CardDescription>One row per agent run — click a run for its governance report</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </WidgetBoundary>
  )
}

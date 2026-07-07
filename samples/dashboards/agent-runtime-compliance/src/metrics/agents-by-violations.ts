import type { Row } from '@/lib/metric-contract'
import type { UiPath } from '@uipath/uipath-typescript/core'
import { THIRTY_DAYS_AGO, NOW } from '@/lib/time'
import { fetchAll } from '@/lib/paginate'

export type FetchOpts = { start?: Date; end?: Date; limit?: number }

export const fetchData = async (
  sdk: UiPath,
  _getToken?: () => Promise<string>,
  opts?: FetchOpts,
): Promise<Row[]> => {
  const start = opts?.start ?? THIRTY_DAYS_AGO
  const end = opts?.end ?? NOW
  const limit = opts?.limit ?? 20
  const { AgentTraces } = await import('@uipath/uipath-typescript/traces')
  const s = await new AgentTraces(sdk).getGovernanceSummary(start, { endTime: end })
  return (s.byAgent ?? [])
    .map(a => ({ name: a.name ?? a.key ?? 'Unknown', value: a.violationCount ?? 0 }))
    .filter(a => a.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

// Return type narrowed to Row[] (vs MetricDetailByKeyFn's Row[] | NamedSourceMap)
// so the generated detail view's Row[] callback type-checks; still assignable.
export const fetchDetailByKey = async (
  sdk: UiPath,
  key: string,
  _getToken: () => Promise<string>,
): Promise<Row[]> => {
  const { AgentTraces } = await import('@uipath/uipath-typescript/traces')
  const svc = new AgentTraces(sdk)
  const rows = await fetchAll(cursor =>
    svc.getGovernanceDecisions(THIRTY_DAYS_AGO, { endTime: NOW, violationsOnly: true, pageSize: 200, cursor }),
  )
  return rows.filter(d => (d.agentName ?? d.agentId ?? 'Unknown') === key).map(x => ({ ...x }))
}

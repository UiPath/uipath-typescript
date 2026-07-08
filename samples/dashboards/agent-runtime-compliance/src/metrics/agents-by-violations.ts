import type { Row } from '@/lib/metric-contract'
import type { UiPath } from '@uipath/uipath-typescript/core'
import { AgentTraces } from '@uipath/uipath-typescript/traces'
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
  const summary = await new AgentTraces(sdk).getGovernanceSummary(start, { endTime: end })
  return (summary.byAgent ?? [])
    .map(agent => ({ name: agent.name ?? agent.key ?? 'Unknown', value: agent.violationCount ?? 0 }))
    .filter(agent => agent.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

// Return type narrowed to Row[] (vs MetricDetailByKeyFn's Row[] | NamedSourceMap)
// so the detail view's Row[] callback type-checks; still assignable.
export const fetchDetailByKey = async (
  sdk: UiPath,
  key: string,
  _getToken: () => Promise<string>,
): Promise<Row[]> => {
  const agentTraces = new AgentTraces(sdk)
  const decisions = await fetchAll(cursor =>
    agentTraces.getGovernanceDecisions(THIRTY_DAYS_AGO, { endTime: NOW, violationsOnly: true, pageSize: 200, cursor }),
  )
  return decisions
    .filter(decision => (decision.agentName ?? decision.agentId ?? 'Unknown') === key)
    .map(decision => ({ ...decision }))
}

import type { MetricFn, Row } from '@/lib/metric-contract'
import type { UiPath } from '@uipath/uipath-typescript/core'
import { AgentTraces } from '@uipath/uipath-typescript/traces'
import { THIRTY_DAYS_AGO, NOW, priorWindow } from '@/lib/time'
import { fetchAll } from '@/lib/paginate'

export type WindowOpts = { start?: Date; end?: Date }

export const fetchData = async (
  sdk: UiPath,
  _getToken?: () => Promise<string>,
  opts?: WindowOpts,
): Promise<Row[]> => {
  const start = opts?.start ?? THIRTY_DAYS_AGO
  const end = opts?.end ?? NOW
  const agentTraces = new AgentTraces(sdk)
  const [previousStart, previousEnd] = priorWindow(start, end)
  const [current, previous] = await Promise.all([
    agentTraces.getGovernanceSummary(start, { endTime: end }),
    agentTraces.getGovernanceSummary(previousStart, { endTime: previousEnd }),
  ])
  return [{ value: current.violations, previous: previous.violations }]
}

export const fetchDetail: MetricFn = async (sdk) => {
  const agentTraces = new AgentTraces(sdk)
  const decisions = await fetchAll(cursor =>
    agentTraces.getGovernanceDecisions(THIRTY_DAYS_AGO, { endTime: NOW, violationsOnly: true, pageSize: 200, cursor }),
  )
  return decisions.map(decision => ({ ...decision }))
}

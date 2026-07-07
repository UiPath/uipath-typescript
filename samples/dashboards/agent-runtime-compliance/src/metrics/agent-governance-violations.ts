import type { MetricFn, Row } from '@/lib/metric-contract'
import type { UiPath } from '@uipath/uipath-typescript/core'
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
  const { AgentTraces } = await import('@uipath/uipath-typescript/traces')
  const svc = new AgentTraces(sdk)
  const [prevStart, prevEnd] = priorWindow(start, end)
  const [cur, prev] = await Promise.all([
    svc.getGovernanceSummary(start, { endTime: end }),
    svc.getGovernanceSummary(prevStart, { endTime: prevEnd }),
  ])
  return [{ value: cur.violations, previous: prev.violations }]
}

export const fetchDetail: MetricFn = async (sdk) => {
  const { AgentTraces } = await import('@uipath/uipath-typescript/traces')
  const svc = new AgentTraces(sdk)
  const rows = await fetchAll(cursor => svc.getGovernanceDecisions(THIRTY_DAYS_AGO, { endTime: NOW, violationsOnly: true, pageSize: 200, cursor }))
  return rows.map(x => ({ ...x }))
}

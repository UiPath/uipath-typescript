import type { MetricFn, Row } from '@/lib/metric-contract'
import type { UiPath } from '@uipath/uipath-typescript/core'
import { THIRTY_DAYS_AGO, NOW } from '@/lib/time'
import { fetchAll } from '@/lib/paginate'

export type WindowOpts = { start?: Date; end?: Date }

export const fetchData = async (
  sdk: UiPath,
  _getToken?: () => Promise<string>,
  opts?: WindowOpts,
): Promise<Row[]> => {
  const start = opts?.start ?? THIRTY_DAYS_AGO
  const end = opts?.end ?? NOW
  const { AgentTraces, AgentGovernanceVerdict, AgentGovernanceMode } = await import('@uipath/uipath-typescript/traces')
  const svc = new AgentTraces(sdk)
  const rows = await fetchAll(cursor => svc.getGovernanceDecisions(start, { endTime: end, pageSize: 200, cursor }))
  let allowed = 0
  let denied = 0
  let observed = 0
  for (const d of rows) {
    if (d.evaluatorResult !== AgentGovernanceVerdict.Deny) {
      allowed += 1
    } else if (d.mode === AgentGovernanceMode.Enforce) {
      denied += 1
    } else if (d.mode === AgentGovernanceMode.Audit) {
      observed += 1
    }
  }
  return [
    { name: 'Allowed', value: allowed },
    { name: 'Denied (enforced)', value: denied },
    { name: 'Observed only (audit)', value: observed },
  ]
}

export const fetchDetail: MetricFn = async (sdk) => {
  const { AgentTraces } = await import('@uipath/uipath-typescript/traces')
  const svc = new AgentTraces(sdk)
  const rows = await fetchAll(cursor => svc.getGovernanceDecisions(THIRTY_DAYS_AGO, { endTime: NOW, pageSize: 200, cursor }))
  return rows.map(x => ({ ...x }))
}

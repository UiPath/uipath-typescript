import type { MetricFn, Row } from '@/lib/metric-contract'
import type { UiPath } from '@uipath/uipath-typescript/core'
import { AgentTraces, AgentGovernanceVerdict, AgentGovernanceMode } from '@uipath/uipath-typescript/traces'
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
  const agentTraces = new AgentTraces(sdk)
  const decisions = await fetchAll(cursor =>
    agentTraces.getGovernanceDecisions(start, { endTime: end, pageSize: 200, cursor }),
  )
  let allowed = 0
  let denied = 0
  let observed = 0
  for (const decision of decisions) {
    if (decision.evaluatorResult !== AgentGovernanceVerdict.Deny) {
      allowed += 1
    } else if (decision.mode === AgentGovernanceMode.Enforce) {
      denied += 1
    } else if (decision.mode === AgentGovernanceMode.Audit) {
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
  const agentTraces = new AgentTraces(sdk)
  const decisions = await fetchAll(cursor =>
    agentTraces.getGovernanceDecisions(THIRTY_DAYS_AGO, { endTime: NOW, pageSize: 200, cursor }),
  )
  return decisions.map(decision => ({ ...decision }))
}

import type { MetricFn, Row } from '@/lib/metric-contract'
import type { UiPath } from '@uipath/uipath-typescript/core'
import { AgentTraces } from '@uipath/uipath-typescript/traces'
import { THIRTY_DAYS_AGO, NOW } from '@/lib/time'

export type WindowOpts = { start?: Date; end?: Date }

export const fetchData = async (
  sdk: UiPath,
  _getToken?: () => Promise<string>,
  opts?: WindowOpts,
): Promise<Row[]> => {
  const start = opts?.start ?? THIRTY_DAYS_AGO
  const end = opts?.end ?? NOW
  const summary = await new AgentTraces(sdk).getGovernanceSummary(start, { endTime: end })
  return [{ value: (summary.byPolicy ?? []).filter(policy => (policy.violationCount ?? 0) > 0).length }]
}

export const fetchDetail: MetricFn = async (sdk) => {
  const summary = await new AgentTraces(sdk).getGovernanceSummary(THIRTY_DAYS_AGO, { endTime: NOW })
  return (summary.byPolicy ?? [])
    .filter(policy => (policy.violationCount ?? 0) > 0)
    .map(policy => ({ name: policy.name ?? policy.key ?? 'Unknown', value: policy.violationCount ?? 0 }))
    .sort((a, b) => b.value - a.value)
}

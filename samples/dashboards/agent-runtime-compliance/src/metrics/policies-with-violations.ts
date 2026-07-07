import type { MetricFn, Row } from '@/lib/metric-contract'
import type { UiPath } from '@uipath/uipath-typescript/core'
import { THIRTY_DAYS_AGO, NOW } from '@/lib/time'

export type WindowOpts = { start?: Date; end?: Date }

export const fetchData = async (
  sdk: UiPath,
  _getToken?: () => Promise<string>,
  opts?: WindowOpts,
): Promise<Row[]> => {
  const start = opts?.start ?? THIRTY_DAYS_AGO
  const end = opts?.end ?? NOW
  const { AgentTraces } = await import('@uipath/uipath-typescript/traces')
  const s = await new AgentTraces(sdk).getGovernanceSummary(start, { endTime: end })
  return [{ value: (s.byPolicy ?? []).filter(p => (p.violationCount ?? 0) > 0).length }]
}

export const fetchDetail: MetricFn = async (sdk) => {
  const { AgentTraces } = await import('@uipath/uipath-typescript/traces')
  const s = await new AgentTraces(sdk).getGovernanceSummary(THIRTY_DAYS_AGO, { endTime: NOW })
  return (s.byPolicy ?? [])
    .filter(p => (p.violationCount ?? 0) > 0)
    .map(p => ({ name: p.name ?? p.key ?? 'Unknown', value: p.violationCount ?? 0 }))
    .sort((a, b) => b.value - a.value)
}

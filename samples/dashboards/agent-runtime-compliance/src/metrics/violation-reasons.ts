import type { MetricFn, Row } from '@/lib/metric-contract'
import type { UiPath } from '@uipath/uipath-typescript/core'
import { THIRTY_DAYS_AGO, NOW } from '@/lib/time'
import { fetchAll } from '@/lib/paginate'

// Reasons are free text with run-specific numbers ("… with a probability of 0.97").
// Normalize to a stable category: strip probability clauses and bare numbers, keep
// the first sentence, cap length — so identical causes land in the same slice.
const normalizeReason = (raw: unknown): string => {
  let text = String(raw ?? '').trim()
  if (!text) return 'Unspecified'
  text = text
    .replace(/\bwith a probability of\s*[\d.]+%?/gi, '')
    .replace(/\b\d+(\.\d+)?%?\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .trim()
  const period = text.indexOf('. ')
  if (period > 0) text = text.slice(0, period)
  text = text.replace(/[.\s]+$/, '')
  if (text.length > 60) text = `${text.slice(0, 57)}…`
  return text || 'Unspecified'
}

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
  const rows = await fetchAll(cursor =>
    svc.getGovernanceDecisions(start, { endTime: end, violationsOnly: true, pageSize: 200, cursor }),
  )
  const counts: Record<string, number> = {}
  for (const d of rows) {
    const category = normalizeReason(d.reason)
    counts[category] = (counts[category] ?? 0) + 1
  }
  const ranked = Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
  if (ranked.length <= 5) return ranked
  const top = ranked.slice(0, 4)
  const other = ranked.slice(4).reduce((sum, r) => sum + r.value, 0)
  return [...top, { name: 'Other', value: other }]
}

export const fetchDetail: MetricFn = async (sdk) => {
  const { AgentTraces } = await import('@uipath/uipath-typescript/traces')
  const svc = new AgentTraces(sdk)
  const rows = await fetchAll(cursor =>
    svc.getGovernanceDecisions(THIRTY_DAYS_AGO, { endTime: NOW, violationsOnly: true, pageSize: 200, cursor }),
  )
  return rows.map(x => ({ ...x }))
}

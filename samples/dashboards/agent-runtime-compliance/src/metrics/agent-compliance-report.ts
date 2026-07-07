import type { MetricFn, MetricDetailByKeyFn } from '@/lib/metric-contract'
import { THIRTY_DAYS_AGO, NOW } from '@/lib/time'
import { fetchAll } from '@/lib/paginate'

type RunRow = {
  runKey: string
  agentName: string
  startTime: string
  evaluated: number
  matched: number
  finalAction: string
}

export const fetchData: MetricFn = async (sdk) => {
  const { AgentTraces, AgentGovernanceVerdict, AgentGovernanceMode } = await import('@uipath/uipath-typescript/traces')
  const svc = new AgentTraces(sdk)
  const rows = await fetchAll(cursor =>
    svc.getGovernanceDecisions(THIRTY_DAYS_AGO, { endTime: NOW, pageSize: 200, cursor }),
  )
  const byRun = new Map<string, RunRow>()
  for (const d of rows) {
    if (!d.traceId) continue
    const run = byRun.get(d.traceId) ?? {
      runKey: d.traceId,
      agentName: d.agentName ?? '—',
      startTime: d.startTime,
      evaluated: 0,
      matched: 0,
      finalAction: 'allow',
    }
    run.evaluated += 1
    if (d.evaluatorResult === AgentGovernanceVerdict.Deny) {
      run.matched += 1
      run.finalAction = d.mode === AgentGovernanceMode.Enforce ? (d.actionApplied ?? 'enforced') : 'audit'
    }
    byRun.set(d.traceId, run)
  }
  return [...byRun.values()].sort((a, b) => b.startTime.localeCompare(a.startTime)).map(r => ({ ...r }))
}

// Rich per-run report: same window, filtered client-side to the clicked run
// (no server-side traceId filter). Returns the named-source map the detailView reads.
export const fetchDetailByKey: MetricDetailByKeyFn = async (sdk, key) => {
  const { AgentTraces, AgentGovernanceVerdict } = await import('@uipath/uipath-typescript/traces')
  const svc = new AgentTraces(sdk)
  const all = await fetchAll(cursor =>
    svc.getGovernanceDecisions(THIRTY_DAYS_AGO, { endTime: NOW, pageSize: 200, cursor }),
  )
  const rows = all.filter(d => d.traceId === key).map(x => ({ ...x }))
  const denies = rows.filter(d => d.evaluatorResult === AgentGovernanceVerdict.Deny)
  const count = (list: typeof rows, pick: (d: (typeof rows)[number]) => string) => {
    const acc: Record<string, number> = {}
    for (const d of list) {
      const k = pick(d)
      acc[k] = (acc[k] ?? 0) + 1
    }
    return Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }
  const hooks = [...new Set(rows.map(d => String(d.hook ?? 'UNKNOWN')))]
  return {
    rows,
    byOutcomeByHook: hooks.map(h => ({
      hook: h,
      Allow: rows.filter(d => String(d.hook ?? 'UNKNOWN') === h && d.evaluatorResult !== AgentGovernanceVerdict.Deny).length,
      Deny: rows.filter(d => String(d.hook ?? 'UNKNOWN') === h && d.evaluatorResult === AgentGovernanceVerdict.Deny).length,
    })),
    byAction: count(denies, d => String(d.actionApplied ?? 'none')),
    byPolicy: count(denies, d => String(d.policyName ?? d.policyId ?? 'Unknown')),
  }
}

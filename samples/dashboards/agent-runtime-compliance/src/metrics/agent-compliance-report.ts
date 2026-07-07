import type { MetricFn, MetricDetailByKeyFn } from '@/lib/metric-contract'
import { AgentTraces, AgentGovernanceVerdict, AgentGovernanceMode } from '@uipath/uipath-typescript/traces'
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
  const agentTraces = new AgentTraces(sdk)
  const decisions = await fetchAll(cursor =>
    agentTraces.getGovernanceDecisions(THIRTY_DAYS_AGO, { endTime: NOW, pageSize: 200, cursor }),
  )
  const byRun = new Map<string, RunRow>()
  for (const decision of decisions) {
    if (!decision.traceId) continue
    const run = byRun.get(decision.traceId) ?? {
      runKey: decision.traceId,
      agentName: decision.agentName ?? '—',
      startTime: decision.startTime,
      evaluated: 0,
      matched: 0,
      finalAction: 'allow',
    }
    run.evaluated += 1
    if (decision.evaluatorResult === AgentGovernanceVerdict.Deny) {
      run.matched += 1
      run.finalAction = decision.mode === AgentGovernanceMode.Enforce ? (decision.actionApplied ?? 'enforced') : 'audit'
    }
    byRun.set(decision.traceId, run)
  }
  return [...byRun.values()].sort((a, b) => b.startTime.localeCompare(a.startTime)).map(run => ({ ...run }))
}

// Rich per-run report: same window, filtered client-side to the clicked run
// (no server-side traceId filter). Returns the named-source map the detailView reads.
export const fetchDetailByKey: MetricDetailByKeyFn = async (sdk, key) => {
  const agentTraces = new AgentTraces(sdk)
  const allDecisions = await fetchAll(cursor =>
    agentTraces.getGovernanceDecisions(THIRTY_DAYS_AGO, { endTime: NOW, pageSize: 200, cursor }),
  )
  const decisions = allDecisions.filter(decision => decision.traceId === key).map(decision => ({ ...decision }))
  const denied = decisions.filter(decision => decision.evaluatorResult === AgentGovernanceVerdict.Deny)
  const hooks = [...new Set(decisions.map(decision => String(decision.hook ?? 'UNKNOWN')))]
  return {
    rows: decisions,
    byOutcomeByHook: hooks.map(hook => ({
      hook,
      Allow: decisions.filter(decision => String(decision.hook ?? 'UNKNOWN') === hook && decision.evaluatorResult !== AgentGovernanceVerdict.Deny).length,
      Deny: decisions.filter(decision => String(decision.hook ?? 'UNKNOWN') === hook && decision.evaluatorResult === AgentGovernanceVerdict.Deny).length,
    })),
    byAction: countBy(denied, decision => String(decision.actionApplied ?? 'none')),
    byPolicy: countBy(denied, decision => String(decision.policyName ?? decision.policyId ?? 'Unknown')),
  }
}

/** Group a list by a picked key and return { name, value } rows, highest count first. */
function countBy<T>(list: T[], pick: (item: T) => string): { name: string; value: number }[] {
  const counts: Record<string, number> = {}
  for (const item of list) {
    const groupKey = pick(item)
    counts[groupKey] = (counts[groupKey] ?? 0) + 1
  }
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

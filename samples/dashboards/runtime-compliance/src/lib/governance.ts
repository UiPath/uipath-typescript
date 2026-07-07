import type { UiPath } from '@uipath/uipath-typescript/core'
import {
  AgentTraces,
  AgentGovernanceMode,
  AgentGovernanceVerdict,
} from '@uipath/uipath-typescript/traces'
import type { AgentGovernanceDecisionGetResponse } from '@uipath/uipath-typescript/traces'
import type { Range } from './time'
import { priorRange } from './time'

/** One compliance-check decision, as returned by the SDK. */
export type Decision = AgentGovernanceDecisionGetResponse

const PAGE_SIZE = 200
// Safety valve for pathological windows; 50 pages × 200 rows is far beyond
// anything a dashboard should render anyway.
const MAX_PAGES = 50

/**
 * Every compliance-check decision in the window, newest data included —
 * cursor-looped because each call returns ONE page.
 */
export async function fetchDecisions(sdk: UiPath, range: Range): Promise<Decision[]> {
  const traces = new AgentTraces(sdk)
  const rows: Decision[] = []
  let page = await traces.getGovernanceDecisions(range.start, {
    endTime: range.end,
    pageSize: PAGE_SIZE,
  })
  rows.push(...page.items)
  let pages = 1
  while (page.hasNextPage && page.nextCursor && pages < MAX_PAGES) {
    page = await traces.getGovernanceDecisions(range.start, {
      endTime: range.end,
      pageSize: PAGE_SIZE,
      cursor: page.nextCursor,
    })
    rows.push(...page.items)
    pages += 1
  }
  return rows
}

export interface KpiTotals {
  /** Deny verdicts in the window. */
  failedChecks: number
  /** Deny verdicts in the equal-length prior window (for the change badge). */
  priorFailedChecks: number
  /** Distinct checks with at least one failure. */
  checksFailing: number
  /** Agents with at least one failed check. */
  flaggedAgents: number
}

/** KPI totals from the aggregated summary — current window + prior window in one round trip each. */
export async function fetchKpis(sdk: UiPath, range: Range): Promise<KpiTotals> {
  const traces = new AgentTraces(sdk)
  const prior = priorRange(range)
  const [current, previous] = await Promise.all([
    traces.getGovernanceSummary(range.start, { endTime: range.end, topN: 100 }),
    traces.getGovernanceSummary(prior.start, { endTime: prior.end }),
  ])
  return {
    failedChecks: current.violations,
    priorFailedChecks: previous.violations,
    checksFailing: current.byPolicy.filter((p) => p.violationCount > 0).length,
    flaggedAgents: current.byAgent.filter((a) => a.violationCount > 0).length,
  }
}

// ── Derivations over decision rows ─────────────────────────────────────────────

export function isFailed(d: Decision): boolean {
  return d.evaluatorResult === AgentGovernanceVerdict.Deny
}

export type Outcome = 'Allowed' | 'Denied' | 'Observed only'

/**
 * Enforcement outcome of one evaluation. Checks running in audit mode are
 * observed-only — logged, never enforced — regardless of verdict.
 */
export function outcomeOf(d: Decision): Outcome {
  if (d.mode !== AgentGovernanceMode.Enforce) return 'Observed only'
  return isFailed(d) ? 'Denied' : 'Allowed'
}

export function checkName(d: Decision): string {
  return d.policyName ?? d.policyId ?? 'Unknown check'
}

export function agentLabel(d: Decision): string {
  return d.agentName ?? d.agentId ?? 'Unknown agent'
}

export interface Slice {
  name: string
  value: number
  /** Optional fixed color — lets semantic slices keep their color when zero-value slices are filtered out. */
  color?: string
}

export function countBy<T>(rows: T[], key: (row: T) => string): Slice[] {
  const acc = new Map<string, number>()
  for (const row of rows) {
    const k = key(row)
    acc.set(k, (acc.get(k) ?? 0) + 1)
  }
  return [...acc.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Group similar failure reasons: reason strings often embed run-specific
 * numbers ("…detected with a probability of 0.97"), which would make every
 * failure its own donut slice. Strip numbers so variants merge.
 */
export function normalizeReason(reason: string | null): string {
  if (!reason) return 'No reason provided'
  const normalized = reason
    .replace(/\d+(?:\.\d+)?%?/g, 'N')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized.length > 0 ? normalized : 'No reason provided'
}

// ── Runs ───────────────────────────────────────────────────────────────────────

export interface RunRow {
  /** The run's trace id — one agent run produces one trace. */
  runKey: string
  agentName: string
  startTime: string
  evaluated: number
  failed: number
  action: string
}

/** One row per agent run: group decisions by their trace. */
export function deriveRuns(rows: Decision[]): RunRow[] {
  const byRun = new Map<string, RunRow>()
  for (const d of rows) {
    if (!d.traceId) continue
    const run = byRun.get(d.traceId) ?? {
      runKey: d.traceId,
      agentName: agentLabel(d),
      startTime: d.startTime,
      evaluated: 0,
      failed: 0,
      action: 'allowed',
    }
    run.evaluated += 1
    if (d.startTime < run.startTime) run.startTime = d.startTime
    if (isFailed(d)) {
      run.failed += 1
      run.action =
        d.mode === AgentGovernanceMode.Enforce ? (d.actionApplied ?? 'denied') : 'observed'
    }
    byRun.set(d.traceId, run)
  }
  return [...byRun.values()].sort((a, b) => b.startTime.localeCompare(a.startTime))
}

export interface HookStat {
  hook: string
  passed: number
  failed: number
}

export interface RunReport {
  rows: Decision[]
  byHook: HookStat[]
  denied: Decision[]
}

/** Full report for one run: per-hook pass/fail plus the complete decision log. */
export function buildRunReport(rows: Decision[], runKey: string): RunReport {
  const runRows = rows
    .filter((d) => d.traceId === runKey)
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  const hooks = [...new Set(runRows.map((d) => d.hook ?? 'UNKNOWN'))]
  return {
    rows: runRows,
    byHook: hooks.map((hook) => ({
      hook,
      passed: runRows.filter((d) => (d.hook ?? 'UNKNOWN') === hook && !isFailed(d)).length,
      failed: runRows.filter((d) => (d.hook ?? 'UNKNOWN') === hook && isFailed(d)).length,
    })),
    denied: runRows.filter(isFailed),
  }
}

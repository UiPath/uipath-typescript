import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import type { Decision, Slice } from '@/lib/governance'
import { countBy, isFailed, normalizeReason, outcomeOf } from '@/lib/governance'
import type { TimeWindow } from '@/lib/time'
import { WINDOWS } from '@/lib/time'
import { AgentsTable } from './AgentsTable'
import { DonutCard } from './DonutCard'
import { InfoTooltip } from './InfoTooltip'
import { KpiSection } from './KpiSection'
import { RunsTable } from './RunsTable'
import { Toggle } from './Toggle'

const OUTCOME_COLORS: Record<string, string> = {
  Allowed: '#16a34a',
  Denied: '#dc2626',
  'Observed only': '#64748b',
}

/** Fixed-order outcome slices with stable semantic colors; zero slices drop out. */
function outcomeSlices(rows: Decision[]): Slice[] {
  const counts = new Map<string, number>()
  for (const d of rows) {
    const outcome = outcomeOf(d)
    counts.set(outcome, (counts.get(outcome) ?? 0) + 1)
  }
  return (['Allowed', 'Denied', 'Observed only'] as const)
    .map((name) => ({ name, value: counts.get(name) ?? 0, color: OUTCOME_COLORS[name] }))
    .filter((slice) => slice.value > 0)
}

const MAX_REASON_SLICES = 6

/** Failed checks grouped by normalized reason; long tails collapse into "Other". */
function reasonSlices(rows: Decision[]): Slice[] {
  const grouped = countBy(rows.filter(isFailed), (d) => normalizeReason(d.reason))
  if (grouped.length <= MAX_REASON_SLICES) return grouped
  const head = grouped.slice(0, MAX_REASON_SLICES - 1)
  const otherTotal = grouped.slice(MAX_REASON_SLICES - 1).reduce((sum, s) => sum + s.value, 0)
  return [...head, { name: 'Other', value: otherTotal }]
}

// Orange-led palette — UiPath orange is the primary chart color.
const REASON_COLORS = ['#fa4616', '#fb923c', '#fdba74', '#7c3aed', '#0ea5e9', '#64748b']
const OUTCOME_FALLBACK_COLORS = ['#fa4616', '#64748b', '#16a34a']

export function Dashboard() {
  const { sdk, logout } = useAuth()
  const [kpiWindow, setKpiWindow] = useState<TimeWindow>('30d')

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-8 lg:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Runtime Compliance Violations</h1>
          <p className="mt-1 text-sm text-slate-500">
            UiPath compliance check results, enforcement outcomes, and flagged agents across your
            AI agent fleet.
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </header>

      {/* Overview row: section label + tooltip on the left, ONE shared window
          toggle for all three KPI cards on the right. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-slate-700">Overview</h2>
          <InfoTooltip text="These metrics reflect UiPath compliance checks — recommended runtime safeguards evaluated during agent runs — not policies deployed by your administrators." />
        </div>
        <Toggle options={WINDOWS} value={kpiWindow} onChange={setKpiWindow} ariaLabel="Overview time range" />
      </div>
      <KpiSection sdk={sdk} window={kpiWindow} />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DonutCard
          sdk={sdk}
          title="Enforcement Outcomes"
          subtitle="Allowed / Denied / Observed-only"
          slicesOf={outcomeSlices}
          recordsOf={(rows) => rows}
          headlineNoun="evaluations"
          colors={OUTCOME_FALLBACK_COLORS}
        />
        <DonutCard
          sdk={sdk}
          title="Why Checks Failed"
          subtitle="Failed checks grouped by reason"
          slicesOf={reasonSlices}
          recordsOf={(rows) => rows.filter(isFailed)}
          headlineNoun="failed checks"
          colors={REASON_COLORS}
        />
      </div>

      <div className="mt-6">
        <AgentsTable sdk={sdk} />
      </div>

      <div className="mt-6">
        <RunsTable sdk={sdk} window="30d" />
      </div>
    </div>
  )
}

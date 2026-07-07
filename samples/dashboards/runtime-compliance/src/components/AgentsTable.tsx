import { useMemo, useState } from 'react'
import type { UiPath } from '@uipath/uipath-typescript/core'
import { useDecisions } from '@/hooks/useGovernance'
import { agentLabel, countBy, isFailed } from '@/lib/governance'
import type { TimeWindow } from '@/lib/time'
import { WINDOWS } from '@/lib/time'
import { fmtInt } from '@/lib/format'
import { CardShell, EmptyBlock, ErrorBlock, LoadingBlock } from './CardShell'
import { Toggle } from './Toggle'

const TOP_OPTIONS = ['5', '10', '20'] as const
type TopN = (typeof TOP_OPTIONS)[number]

/** Agents ranked by failed checks, highest first, with Top-N + time toggles. */
export function AgentsTable({ sdk }: { sdk: UiPath }) {
  const [window, setWindow] = useState<TimeWindow>('30d')
  const [topN, setTopN] = useState<TopN>('20')
  const decisions = useDecisions(sdk, window)

  const ranked = useMemo(() => {
    const failed = (decisions.data ?? []).filter(isFailed)
    return countBy(failed, agentLabel).slice(0, Number(topN))
  }, [decisions.data, topN])

  const max = ranked[0]?.value ?? 0

  return (
    <CardShell
      title="Agents by Failed Checks"
      subtitle="Ranked, highest first"
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <Toggle
            options={TOP_OPTIONS}
            value={topN}
            onChange={setTopN}
            labels={{ '5': 'Top 5', '10': 'Top 10', '20': 'Top 20' }}
            ariaLabel="Agents table size"
          />
          <Toggle options={WINDOWS} value={window} onChange={setWindow} ariaLabel="Agents table time range" />
        </div>
      }
    >
      {decisions.error ? (
        <ErrorBlock message={decisions.error} />
      ) : decisions.loading ? (
        <LoadingBlock />
      ) : ranked.length === 0 ? (
        <EmptyBlock />
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
              <th className="w-56 py-2 pr-3 font-medium">Agent</th>
              <th className="py-2 pr-3 font-medium" aria-hidden="true"></th>
              <th className="w-28 py-2 text-right font-medium">Failed Checks</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row) => (
              <tr key={row.name} className="border-b border-slate-100">
                <td className="max-w-0 truncate py-2.5 pr-3" title={row.name}>
                  {row.name}
                </td>
                <td className="py-2.5 pr-3">
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-(--brand)"
                      style={{ width: `${max > 0 ? Math.max((row.value / max) * 100, 2) : 0}%` }}
                    />
                  </div>
                </td>
                <td className="py-2.5 text-right font-semibold tabular-nums">{fmtInt(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </CardShell>
  )
}

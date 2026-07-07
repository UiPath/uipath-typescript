import { useMemo, useState } from 'react'
import type { UiPath } from '@uipath/uipath-typescript/core'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useDecisions } from '@/hooks/useGovernance'
import { buildRunReport, deriveRuns } from '@/lib/governance'
import type { TimeWindow } from '@/lib/time'
import { fmtInt, fmtTime } from '@/lib/format'
import { CardShell, EmptyBlock, ErrorBlock, LoadingBlock } from './CardShell'
import { RunReportModal } from './RunReportModal'

const PAGE_SIZE = 25

/**
 * One row per agent run, newest first, paginated. Clicking a run opens its
 * full compliance report.
 */
export function RunsTable({ sdk, window }: { sdk: UiPath; window: TimeWindow }) {
  const decisions = useDecisions(sdk, window)
  const [page, setPage] = useState(0)
  const [openRun, setOpenRun] = useState<string | null>(null)

  const runs = useMemo(() => deriveRuns(decisions.data ?? []), [decisions.data])
  const pageCount = Math.max(1, Math.ceil(runs.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount - 1)
  const visible = runs.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE)

  const report = useMemo(
    () => (openRun ? buildRunReport(decisions.data ?? [], openRun) : null),
    [decisions.data, openRun],
  )

  return (
    <>
      <CardShell title="Agent Compliance by Run" subtitle="One row per agent run — click a run for its full report">
        {decisions.error ? (
          <ErrorBlock message={decisions.error} />
        ) : decisions.loading ? (
          <LoadingBlock />
        ) : runs.length === 0 ? (
          <EmptyBlock />
        ) : (
          <>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                  <th className="py-2 pr-3 font-medium">Agent</th>
                  <th className="w-44 py-2 pr-3 font-medium">Started</th>
                  <th className="w-24 py-2 pr-3 text-right font-medium">Evaluated</th>
                  <th className="w-24 py-2 pr-3 text-right font-medium">Failed</th>
                  <th className="w-28 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((run) => (
                  <tr
                    key={run.runKey}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                    onClick={() => setOpenRun(run.runKey)}
                  >
                    <td className="max-w-0 truncate py-2.5 pr-3 font-medium" title={run.agentName}>
                      {run.agentName}
                    </td>
                    <td className="truncate py-2.5 pr-3 text-slate-600" title={fmtTime(run.startTime)}>
                      {fmtTime(run.startTime)}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{fmtInt(run.evaluated)}</td>
                    <td
                      className={`py-2.5 pr-3 text-right font-semibold tabular-nums ${
                        run.failed > 0 ? 'text-red-600' : 'text-slate-400'
                      }`}
                    >
                      {fmtInt(run.failed)}
                    </td>
                    <td className="truncate py-2.5 text-slate-600" title={run.action}>
                      {run.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {fmtInt(clampedPage * PAGE_SIZE + 1)}–
                {fmtInt(Math.min((clampedPage + 1) * PAGE_SIZE, runs.length))} of {fmtInt(runs.length)} runs
              </span>
              <span className="inline-flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={clampedPage === 0}
                  onClick={() => setPage(clampedPage - 1)}
                  className="rounded-md border border-slate-200 p-1 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-1 tabular-nums">
                  {fmtInt(clampedPage + 1)} / {fmtInt(pageCount)}
                </span>
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={clampedPage >= pageCount - 1}
                  onClick={() => setPage(clampedPage + 1)}
                  className="rounded-md border border-slate-200 p-1 disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          </>
        )}
      </CardShell>

      {openRun && report && (
        <RunReportModal
          report={report}
          agentName={runs.find((r) => r.runKey === openRun)?.agentName ?? 'Agent run'}
          onClose={() => setOpenRun(null)}
        />
      )}
    </>
  )
}

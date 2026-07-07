import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { UiPath } from '@uipath/uipath-typescript/core'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { useDecisions, useKpis } from '@/hooks/useGovernance'
import type { Decision } from '@/lib/governance'
import { agentLabel, checkName, isFailed } from '@/lib/governance'
import type { TimeWindow } from '@/lib/time'
import { WINDOW_LABEL } from '@/lib/time'
import { fmtInt } from '@/lib/format'
import { CardShell, EmptyBlock, ErrorBlock, LoadingBlock } from './CardShell'
import { DecisionsTable } from './DecisionsTable'
import { Modal } from './Modal'

type KpiModal = 'failed' | 'checks' | 'agents' | null

interface KpiSectionProps {
  sdk: UiPath
  window: TimeWindow
}

/** Grouped evaluated-vs-failed table used by the Checks Failing / Flagged Agents drill-downs. */
function GroupedTable({
  rows,
  keyOf,
  keyHeader,
}: {
  rows: Decision[]
  keyOf: (d: Decision) => string
  keyHeader: string
}) {
  const grouped = useMemo(() => {
    const acc = new Map<string, { evaluated: number; failed: number }>()
    for (const d of rows) {
      const k = keyOf(d)
      const entry = acc.get(k) ?? { evaluated: 0, failed: 0 }
      entry.evaluated += 1
      if (isFailed(d)) entry.failed += 1
      acc.set(k, entry)
    }
    return [...acc.entries()]
      .filter(([, v]) => v.failed > 0)
      .sort((a, b) => b[1].failed - a[1].failed)
  }, [rows, keyOf])

  if (grouped.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">Nothing failing in this window.</p>
  }
  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
          <th className="py-2 pr-3 font-medium">{keyHeader}</th>
          <th className="w-28 py-2 pr-3 text-right font-medium">Evaluated</th>
          <th className="w-28 py-2 text-right font-medium">Failed</th>
        </tr>
      </thead>
      <tbody>
        {grouped.map(([name, v]) => (
          <tr key={name} className="border-b border-slate-100">
            <td className="max-w-0 truncate py-2 pr-3" title={name}>
              {name}
            </td>
            <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(v.evaluated)}</td>
            <td className="py-2 text-right font-semibold tabular-nums">{fmtInt(v.failed)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function KpiSection({ sdk, window }: KpiSectionProps) {
  const kpis = useKpis(sdk, window)
  const decisions = useDecisions(sdk, window)
  const [open, setOpen] = useState<KpiModal>(null)

  const failedRows = useMemo(
    () => (decisions.data ?? []).filter(isFailed),
    [decisions.data],
  )

  const delta = (kpis.data?.failedChecks ?? 0) - (kpis.data?.priorFailedChecks ?? 0)

  const cards: Array<{
    key: Exclude<KpiModal, null>
    title: string
    description: string
    value: number | undefined
    badge?: ReactNode
  }> = [
    {
      key: 'failed',
      title: 'Failed Compliance Checks',
      description: 'Deny verdicts from UiPath compliance checks',
      value: kpis.data?.failedChecks,
      badge:
        kpis.data && delta !== 0 ? (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
              delta > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
            }`}
            title={`${fmtInt(Math.abs(delta))} ${delta > 0 ? 'more' : 'fewer'} than the prior period`}
          >
            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta > 0 ? '+' : '−'}
            {fmtInt(Math.abs(delta))}
          </span>
        ) : undefined,
    },
    {
      key: 'checks',
      title: 'Checks Failing',
      description: 'Distinct compliance checks breached',
      value: kpis.data?.checksFailing,
    },
    {
      key: 'agents',
      title: 'Flagged Agents',
      description: 'Agents with at least one failed check',
      value: kpis.data?.flaggedAgents,
    },
  ]

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <CardShell
            key={card.key}
            title={card.title}
            onViewAll={() => setOpen(card.key)}
          >
            {kpis.error ? (
              <ErrorBlock message={kpis.error} />
            ) : kpis.loading ? (
              <LoadingBlock />
            ) : (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums">
                    {fmtInt(card.value ?? 0)}
                  </span>
                  {card.badge}
                </div>
                <p className="mt-1 text-xs text-slate-500">{card.description}</p>
                {card.key === 'failed' && (
                  <p className="mt-0.5 text-xs text-slate-400">vs prior period</p>
                )}
              </div>
            )}
          </CardShell>
        ))}
      </div>

      {open === 'failed' && (
        <Modal
          title="Failed Compliance Checks"
          subtitle={`Every deny verdict in the ${WINDOW_LABEL[window]}`}
          onClose={() => setOpen(null)}
        >
          {decisions.loading ? (
            <LoadingBlock />
          ) : failedRows.length === 0 ? (
            <EmptyBlock />
          ) : (
            <DecisionsTable rows={failedRows} />
          )}
        </Modal>
      )}
      {open === 'checks' && (
        <Modal
          title="Checks Failing"
          subtitle={`Compliance checks with at least one failure in the ${WINDOW_LABEL[window]}`}
          onClose={() => setOpen(null)}
        >
          {decisions.loading ? (
            <LoadingBlock />
          ) : (
            <GroupedTable rows={decisions.data ?? []} keyOf={checkName} keyHeader="Check" />
          )}
        </Modal>
      )}
      {open === 'agents' && (
        <Modal
          title="Flagged Agents"
          subtitle={`Agents with at least one failed check in the ${WINDOW_LABEL[window]}`}
          onClose={() => setOpen(null)}
        >
          {decisions.loading ? (
            <LoadingBlock />
          ) : (
            <GroupedTable rows={decisions.data ?? []} keyOf={agentLabel} keyHeader="Agent" />
          )}
        </Modal>
      )}
    </>
  )
}

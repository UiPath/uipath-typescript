import { useMemo, useState } from 'react'
import type { UiPath } from '@uipath/uipath-typescript/core'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useDecisions } from '@/hooks/useGovernance'
import type { Decision, Slice } from '@/lib/governance'
import type { TimeWindow } from '@/lib/time'
import { WINDOWS, WINDOW_LABEL } from '@/lib/time'
import { fmtInt, fmtPercent } from '@/lib/format'
import { CardShell, EmptyBlock, ErrorBlock, LoadingBlock } from './CardShell'
import { DecisionsTable } from './DecisionsTable'
import { Modal } from './Modal'
import { Toggle } from './Toggle'

interface DonutCardProps {
  sdk: UiPath
  title: string
  subtitle: string
  /** Derive donut slices from the window's decisions. */
  slicesOf: (rows: Decision[]) => Slice[]
  /** Rows behind the donut, shown by "View all". */
  recordsOf: (rows: Decision[]) => Decision[]
  headlineNoun: string
  colors: string[]
}

/**
 * Donut over the window's compliance-check decisions, with its own time
 * toggle. The legend always lists every slice with count + percentage, so the
 * chart stays readable even when one slice dominates (e.g. 97% observed-only).
 */
export function DonutCard({
  sdk,
  title,
  subtitle,
  slicesOf,
  recordsOf,
  headlineNoun,
  colors,
}: DonutCardProps) {
  const [window, setWindow] = useState<TimeWindow>('30d')
  const [open, setOpen] = useState(false)
  const decisions = useDecisions(sdk, window)

  const slices = useMemo(() => slicesOf(decisions.data ?? []), [decisions.data, slicesOf])
  const records = useMemo(() => recordsOf(decisions.data ?? []), [decisions.data, recordsOf])
  const total = slices.reduce((sum, s) => sum + s.value, 0)

  return (
    <>
      <CardShell
        title={title}
        subtitle={subtitle}
        onViewAll={() => setOpen(true)}
        controls={
          <Toggle options={WINDOWS} value={window} onChange={setWindow} ariaLabel={`${title} time range`} />
        }
      >
        {decisions.error ? (
          <ErrorBlock message={decisions.error} />
        ) : decisions.loading ? (
          <LoadingBlock />
        ) : total === 0 ? (
          <EmptyBlock />
        ) : (
          <div className="flex items-center gap-6">
            <div className="h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={slices.length > 1 ? 2 : 0}
                    strokeWidth={0}
                  >
                    {slices.map((slice, i) => (
                      <Cell key={slice.name} fill={slice.color ?? colors[i % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => fmtInt(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-sm font-semibold">
                {fmtInt(total)} {headlineNoun}
              </p>
              <ul className="space-y-1.5">
                {slices.map((slice, i) => (
                  <li key={slice.name} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: slice.color ?? colors[i % colors.length] }}
                    />
                    <span className="min-w-0 flex-1 truncate text-slate-700" title={slice.name}>
                      {slice.name}
                    </span>
                    <span className="shrink-0 text-slate-500 tabular-nums">
                      {fmtInt(slice.value)} ({fmtPercent(slice.value, total)})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardShell>

      {open && (
        <Modal
          title={title}
          subtitle={`Individual records in the ${WINDOW_LABEL[window]}`}
          onClose={() => setOpen(false)}
        >
          {records.length === 0 ? <EmptyBlock /> : <DecisionsTable rows={records} />}
        </Modal>
      )}
    </>
  )
}

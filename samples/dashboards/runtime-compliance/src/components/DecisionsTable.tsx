import type { Decision } from '@/lib/governance'
import { agentLabel, checkName } from '@/lib/governance'
import { fmtTime } from '@/lib/format'

/**
 * Shared record-grain table: one row per compliance-check decision.
 * Truncated cells always expose their full value via `title` (hover).
 */
export function DecisionsTable({ rows }: { rows: Decision[] }) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">No records in this window.</p>
  }
  return (
    <table className="w-full table-fixed border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
          <th className="w-[16%] py-2 pr-3 font-medium">Agent</th>
          <th className="w-[18%] py-2 pr-3 font-medium">Check</th>
          <th className="w-[12%] py-2 pr-3 font-medium">Hook</th>
          <th className="w-[9%] py-2 pr-3 font-medium">Mode</th>
          <th className="w-[9%] py-2 pr-3 font-medium">Action</th>
          <th className="w-[24%] py-2 pr-3 font-medium">Reason</th>
          <th className="w-[12%] py-2 font-medium">Time</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((d, i) => (
          <tr key={`${d.traceId}-${i}`} className="border-b border-slate-100 align-top">
            <td className="truncate py-2 pr-3" title={agentLabel(d)}>
              {agentLabel(d)}
            </td>
            <td className="truncate py-2 pr-3" title={checkName(d)}>
              {checkName(d)}
            </td>
            <td className="truncate py-2 pr-3 text-slate-600" title={d.hook ?? ''}>
              {d.hook ?? '—'}
            </td>
            <td className="py-2 pr-3 text-slate-600">{d.mode.toLowerCase()}</td>
            <td className="truncate py-2 pr-3 text-slate-600" title={d.actionApplied ?? ''}>
              {d.actionApplied?.toLowerCase() ?? '—'}
            </td>
            <td className="truncate py-2 pr-3 text-slate-600" title={d.reason ?? ''}>
              {d.reason ?? '—'}
            </td>
            <td className="truncate py-2 text-slate-500" title={fmtTime(d.startTime)}>
              {fmtTime(d.startTime)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

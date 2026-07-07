import { CheckCircle2, XCircle } from 'lucide-react'
import type { RunReport } from '@/lib/governance'
import { checkName } from '@/lib/governance'
import { fmtInt } from '@/lib/format'
import { DecisionsTable } from './DecisionsTable'
import { Modal } from './Modal'

interface RunReportModalProps {
  report: RunReport
  agentName: string
  onClose: () => void
}

/**
 * Full compliance report for one agent run: checks passed vs failed at each
 * lifecycle hook, what was denied and why, and the complete decision log.
 */
export function RunReportModal({ report, agentName, onClose }: RunReportModalProps) {
  return (
    <Modal title={`Compliance report — ${agentName}`} onClose={onClose}>
      <h4 className="mb-2 text-xs font-semibold text-slate-500 uppercase">Checks by lifecycle hook</h4>
      <div className="mb-5 flex flex-wrap gap-2">
        {report.byHook.map((h) => (
          <span
            key={h.hook}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          >
            <span className="font-medium">{h.hook}</span>
            <span className="inline-flex items-center gap-0.5 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {fmtInt(h.passed)}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 ${h.failed > 0 ? 'text-red-600' : 'text-slate-400'}`}
            >
              <XCircle className="h-3.5 w-3.5" />
              {fmtInt(h.failed)}
            </span>
          </span>
        ))}
      </div>

      {report.denied.length > 0 && (
        <>
          <h4 className="mb-2 text-xs font-semibold text-slate-500 uppercase">Denied — and why</h4>
          <ul className="mb-5 space-y-2">
            {report.denied.map((d, i) => (
              <li key={i} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm">
                <span className="font-medium">{checkName(d)}</span>
                <span className="text-slate-500"> · {d.hook ?? '—'} · </span>
                <span className="text-slate-600">{d.actionApplied?.toLowerCase() ?? 'denied'}</span>
                {d.reason && <p className="mt-1 text-xs text-slate-600">{d.reason}</p>}
              </li>
            ))}
          </ul>
        </>
      )}

      <h4 className="mb-2 text-xs font-semibold text-slate-500 uppercase">Complete decision log</h4>
      <DecisionsTable rows={report.rows} />
    </Modal>
  )
}

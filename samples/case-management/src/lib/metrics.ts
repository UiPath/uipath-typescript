import type { CaseDefinition, CaseSla } from '@/lib/types';

const RUNNING = ['running', 'in progress', 'inprogress', 'active', 'resuming', 'pausing', 'retrying'];
const DONE = ['completed', 'closed', 'done', 'resolved'];

export function isRunning(status?: string) {
  return RUNNING.includes((status || '').toLowerCase());
}
export function isDone(status?: string) {
  return DONE.includes((status || '').toLowerCase());
}
export function isFaulted(status?: string) {
  const s = (status || '').toLowerCase();
  return s === 'faulted' || s === 'failed';
}

export interface TenantMetrics {
  types: number;
  total: number;
  active: number;
  faulted: number;
  completed: number;
  paused: number;
  pending: number;
}

/**
 * Case-level KPIs derived from the case *definition* (which carries live
 * per-state instance counts) — so views never have to enumerate individual
 * instances. Takes a list to keep the rollup generic, though this app scopes to
 * a single case.
 */
export function tenantMetrics(definitions: CaseDefinition[]): TenantMetrics {
  const m: TenantMetrics = { types: definitions.length, total: 0, active: 0, faulted: 0, completed: 0, paused: 0, pending: 0 };
  for (const d of definitions) {
    const running = d.runningCount + (d.retryingCount ?? 0);
    m.active += running + d.pendingCount + d.pausedCount;
    m.faulted += d.faultedCount;
    m.completed += d.completedCount;
    m.paused += d.pausedCount;
    m.pending += d.pendingCount;
    m.total += running + d.pendingCount + d.pausedCount + d.completedCount + d.faultedCount + d.cancelledCount;
  }
  return m;
}

/** SLA tallies from a set of SLA-summary rows (fetched lazily, on demand). */
export function slaCounts(rows: CaseSla[]) {
  let onTrack = 0, atRisk = 0, breached = 0;
  for (const r of rows) {
    if (r.slaStatus === 'on-track') onTrack++;
    else if (r.slaStatus === 'at-risk') atRisk++;
    else if (r.slaStatus === 'breached') breached++;
  }
  const withSla = onTrack + atRisk + breached;
  return { onTrack, atRisk, breached, compliance: withSla ? ((withSla - breached) / withSla) * 100 : null };
}

const SLA_RANK: Record<string, number> = { breached: 3, 'at-risk': 2, 'on-track': 1 };
export function slaUrgency(s: CaseSla): number {
  const base = (SLA_RANK[s.slaStatus] ?? 0) * 1_000_000;
  if (s.slaDueTime) {
    const h = (new Date(s.slaDueTime).getTime() - Date.now()) / 3600000;
    if (!Number.isNaN(h)) return base - h;
  }
  return base;
}

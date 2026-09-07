// Pure presentation helpers — no data is fabricated here, only formatted.

export function formatDate(value?: string | null, withTime = true): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (!withTime) return date;
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date}, ${time}`;
}

export function relativeTime(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value).getTime();
  if (Number.isNaN(d)) return '';
  const diff = Date.now() - d;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return formatDate(value, false);
}

/** Hours until a deadline; negative if past due. null if no date. */
export function hoursUntil(value?: string | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return null;
  return (t - Date.now()) / 3600000;
}

export type Tone = 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'violet';

export function statusTone(status?: string | null): Tone {
  const s = (status || '').toLowerCase();
  if (['completed', 'closed', 'done', 'resolved'].includes(s)) return 'green';
  if (['faulted', 'failed', 'cancelled', 'canceled', 'breached', 'rejected'].includes(s)) return 'red';
  if (['running', 'in progress', 'inprogress', 'active', 'resuming'].includes(s)) return 'blue';
  if (['paused', 'pausing', 'pending', 'retrying', 'unassigned'].includes(s)) return 'amber';
  return 'gray';
}

export function priorityTone(priority?: string | null): Tone {
  const p = (priority || '').toLowerCase();
  if (p === 'critical') return 'red';
  if (p === 'high') return 'amber';
  if (p === 'medium') return 'blue';
  if (p === 'low') return 'gray';
  return 'gray';
}

/** Title-case a raw status/string for display. */
export function humanize(value?: string | null): string {
  if (!value) return '—';
  return value
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const CURRENCY_RE = /^\$?\s?-?\d[\d,]*(\.\d+)?$/;
export function looksLikeMoney(v: string): boolean {
  return /\$\s?\d/.test(v) || (CURRENCY_RE.test(v.trim()) && v.includes(','));
}

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB']
const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g

/** Renders an ISO timestamp in the user's locale; `—` for null/absent. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : dateTimeFormat.format(date)
}

/** Human-readable byte size, e.g. `1.4 MB`. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), SIZE_UNITS.length - 1)
  const value = bytes / 1024 ** exp
  return `${value >= 10 || exp === 0 ? value.toFixed(0) : value.toFixed(1)} ${SIZE_UNITS[exp]}`
}

/** Last path segment — `/invoices/2024/a.pdf` → `a.pdf`. */
export function fileName(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  return trimmed.slice(trimmed.lastIndexOf('/') + 1) || path
}

/** Escapes user input for use inside a regex (the `fileNameRegex` filter). */
export function escapeRegex(value: string): string {
  return value.replace(REGEX_SPECIAL_CHARS, '\\$&')
}

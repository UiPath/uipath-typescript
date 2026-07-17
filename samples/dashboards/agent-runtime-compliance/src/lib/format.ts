// Auto precision: integers stay integers; only genuine fractions get 1 decimal
const compact = (v: number, suffix: string) => {
  const rounded = Math.round(v * 10) / 10
  return (Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1)) + suffix
}

export function fmtNumber(n: number | null | undefined, decimals?: number): string {
  if (n == null) return '—'
  if (decimals !== undefined) return n.toFixed(decimals)
  if (Math.abs(n) < 10) return compact(n, '')
  if (Math.abs(n) < 1000) return Math.round(n).toString()
  if (Math.abs(n) < 1_000_000) return compact(n / 1000, 'k')
  return compact(n / 1_000_000, 'M')
}

export function fmtPercent(n: number | null | undefined, decimals = 1): string {
  if (n == null) return '—'
  return `${n.toFixed(decimals)}%`
}

export function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`
  return `${(seconds / 3600).toFixed(1)}h`
}

export function fmtTimeAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffM = Math.floor(diffMs / 60000)
  if (diffM < 1) return 'just now'
  if (diffM < 60) return `${diffM}m ago`
  const diffH = Math.floor(diffM / 60)
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

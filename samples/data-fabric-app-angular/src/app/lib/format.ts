/**
 * Renders a single cell value for the records table. Mirrors the formatting
 * used by csv-export so the UI and the exported CSV agree on what each
 * value looks like.
 */
export function formatCell(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  if (value instanceof Date) return value.toISOString()
  // Reference fields / choice sets come back as objects — try displayName,
  // otherwise JSON-encode.
  if (typeof value === 'object') {
    const obj = value as { displayName?: string; name?: string; Id?: string }
    if (obj.displayName) return obj.displayName
    if (obj.name) return obj.name
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

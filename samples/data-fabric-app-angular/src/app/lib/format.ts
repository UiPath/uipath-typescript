import type { EntityRecord, FieldMetaData } from '@uipath/uipath-typescript/entities'

/**
 * Reads a field's value from a record. Records come back keyed by field
 * `name` OR `displayName` depending on the entity — check both. Every
 * consumer (grid, inspector, editor, CSV export) must use this so an
 * entity that keys by displayName renders consistently everywhere.
 */
export function recordFieldValue(
  record: EntityRecord,
  field: FieldMetaData,
): unknown {
  return (
    record[field.name] ??
    (field.displayName ? record[field.displayName] : undefined)
  )
}

/**
 * Renders a single cell value for display. The single source of truth for
 * value formatting — the records grid, sort comparator, and CSV export all
 * project values through this so they always agree (CSV differs only for
 * null/undefined, which export as an empty cell rather than "—").
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

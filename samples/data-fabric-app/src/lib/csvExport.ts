import type { EntityRow, EntityField } from '../hooks/useEntity'
import { downloadBlobAsFile } from './download'

/** Matches characters that require RFC 4180 quoting in a CSV cell. */
const CSV_ESCAPE_REGEX = /[",\r\n]/

/**
 * Exports the given records to a CSV file and triggers a browser download.
 *
 * Column selection:
 *  - All non-attachment fields are included (attachments are files, not
 *    something that fits in a CSV cell — we'd just be writing file names).
 *  - Columns appear in schema order, with `Id` first for stable identity.
 *  - Header row uses `displayName` if present, falling back to `name`.
 *
 * Escaping follows RFC 4180:
 *  - Values containing comma, quote, or newline are wrapped in double quotes.
 *  - Embedded double quotes are doubled (`"` → `""`).
 *  - `null` and `undefined` render as empty cells.
 *  - Objects (e.g. reference fields) are JSON-stringified.
 */
export function exportRecordsAsCsv(
  filename: string,
  fields: EntityField[],
  records: EntityRow[],
): void {
  // Pick exportable columns: skip attachments. Put Id first.
  const exportable = fields.filter((f) => !f.isAttachment)
  const ordered = [
    ...exportable.filter((f) => f.isPrimaryKey),
    ...exportable.filter((f) => !f.isPrimaryKey),
  ]

  const header = ordered.map((f) => csvCell(f.displayName ?? f.name)).join(',')

  const rows = records.map((record) =>
    ordered
      .map((field) => {
        // Records come back keyed by field name OR displayName depending on
        // the entity; check both.
        const value =
          record[field.name] ?? (field.displayName && record[field.displayName])
        return csvCell(formatValue(value))
      })
      .join(','),
  )

  const csv = [header, ...rows].join('\r\n')
  // Prepend a UTF-8 BOM so Excel opens accented characters correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  downloadBlobAsFile(blob, filename)
}

function formatValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  if (value instanceof Date) return value.toISOString()
  // Reference fields and choice sets come through as objects; JSON-encode
  // them so the cell is still human-readable.
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function csvCell(input: string): string {
  // RFC 4180 escaping: quote if the value contains delimiters or newlines.
  if (CSV_ESCAPE_REGEX.test(input)) {
    return `"${input.replace(/"/g, '""')}"`
  }
  return input
}

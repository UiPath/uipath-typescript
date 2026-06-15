import { Database } from 'lucide-react'
import type { EntityField, EntityRow } from '../hooks/useEntity'
import { Skeleton } from '@uipath/apollo-wind/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@uipath/apollo-wind/components/ui/alert'

interface Props {
  fields: EntityField[]
  records: EntityRow[]
  loading: boolean
  error: string | null
  /** Click handler on the `Id` cell — opens the Row Inspector if provided. */
  onInspect?: (id: string) => void
}

/**
 * A simple read-only table for entities the data-table widget can't render
 * faithfully — specifically SystemEntity (Users, Roles, etc.), where every
 * field is marked `isSystemField: true` and the widget filters those out
 * (showing only `Id`).
 *
 * Trade-offs vs the widget:
 *  - No inline edit / sort / filter (acceptable for read-only data).
 *  - Renders all fields including system ones, which is the whole point.
 *  - Sortable columns and pagination could be added later if needed; for
 *    now we render the full set of records the SDK returned.
 */
export function ReadOnlyRecordsTable({
  fields,
  records,
  loading,
  error,
  onInspect,
}: Props) {
  // Put `Id` first, then everything else in schema order.
  const ordered = [
    ...fields.filter((f) => f.isPrimaryKey),
    ...fields.filter((f) => !f.isPrimaryKey),
  ]

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6 space-y-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn't load records</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (records.length === 0) {
    return (
      <div className="rounded-lg border bg-card px-3 py-12 text-center">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-2 text-muted-foreground">
          <Database className="h-6 w-6" />
        </div>
        <span className="text-sm text-muted-foreground">
          No records to display.
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase tracking-wide sticky top-0">
          <tr className="border-b">
            {ordered.map((f) => (
              <th
                key={f.id}
                className="px-3 py-2 font-medium whitespace-nowrap"
                title={f.displayName ?? f.name}
              >
                {f.displayName ?? f.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((row) => (
            <tr
              key={row.Id}
              className="border-b last:border-b-0 hover:bg-muted/30"
            >
              {ordered.map((f) => {
                // Records come back keyed by `name` or `displayName` depending
                // on the entity — check both.
                const raw =
                  row[f.name] ??
                  (f.displayName ? row[f.displayName] : undefined)
                const isId = f.isPrimaryKey
                return (
                  <td
                    key={f.id}
                    className={`px-3 py-2 align-top ${
                      isId ? 'font-mono text-xs' : ''
                    }`}
                  >
                    {isId && onInspect ? (
                      <button
                        type="button"
                        onClick={() => onInspect(row.Id)}
                        className="text-primary hover:underline cursor-pointer text-left"
                        title="Inspect record details"
                      >
                        {row.Id}
                      </button>
                    ) : (
                      formatCell(raw)
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Renders a single cell value. Mirrors the formatting used by csvExport so
 * the UI and the exported CSV agree on what each value looks like.
 */
function formatCell(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
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

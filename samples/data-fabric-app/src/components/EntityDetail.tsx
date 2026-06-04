import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { Download, Plus, RefreshCw } from 'lucide-react'
import { DataTable } from '@uipath/ui-widgets-datatable'
import { Button } from '@/components/ui/button'
import { RecordEditor } from './RecordEditor'
import { RowInspector } from './RowInspector'
// Widget styles are loaded via a <link> in index.html (synced from
// node_modules by the syncWidgetStyles Vite plugin). This avoids PostCSS
// processing the widget's compiled CSS, which would otherwise trip
// Tailwind's strict `@layer base` check.
import { useAuth } from '../hooks/useAuth'
import { useEntity } from '../hooks/useEntity'
import { useWidgetToolbarOverrides } from '../hooks/useWidgetToolbar'
import { exportRecordsAsCsv } from '../lib/csvExport'
import { toast } from 'sonner'
import type { EntitySchema } from '../hooks/useEntity'
import { Skeleton } from '@/components/ui/skeleton'
import { ChoiceSetView } from './ChoiceSetView'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  entityNotSupportedReason,
  entityTypeTooltip,
  isVirtualDataObject,
} from '../lib/entityTypes'

// Re-export types from the hook so any external imports keep working.
export type { EntityField, EntityRow, EntitySchema } from '../hooks/useEntity'

interface Props {
  entityId: string
}

/**
 * Right-pane detail view for one entity.
 *
 * Rendering branches by entity kind:
 *  - **Regular Entity** → @uipath/ui-widgets-datatable handles the full CRUD UI
 *    (schema fetch, record fetch, inline edit, add/delete, filter, sort,
 *    pagination, foreign-key resolution, choice-set inline pickers).
 *  - **ChoiceSet** → dedicated read-only viewer via ChoiceSets service.
 *  - **VDO / InternalEntity / SystemEntity** → friendly "not viewable" notice.
 *
 * We still call `useEntity` here to pull the schema for the page header
 * (display name, description, type badge). The widget fetches schema again
 * internally — that's a small duplicate request, but the cleanest path while
 * the widget's API doesn't accept a pre-loaded schema.
 */
export function EntityDetail({ entityId }: Props) {
  const { sdk } = useAuth()
  const { schema, loading, error, reload, reloadRecords } = useEntity(entityId)
  const [exporting, setExporting] = useState(false)

  // Modal state. `creating` opens it in create mode; `editing` opens it
  // pre-filled with that record. (Edit triggering UI isn't wired yet — the
  // widget doesn't expose row selection; we'll add an "Edit selected" path
  // once we decide on the trigger.)
  const [creating, setCreating] = useState(false)
  // Record-id currently open in the Row Inspector (read-only details view).
  // Trigger: click the Id cell in the widget; see columnConfig['Id'].
  const [inspectingId, setInspectingId] = useState<string | null>(null)

  // Hide the widget toolbar buttons we've replaced with our own UI
  // (Add Row → "Add data" modal, Refresh → page-header button). Native
  // "Show Diff → Commit Changes" flow stays intact for inline edits.
  useWidgetToolbarOverrides()

  // Per-field AG Grid column overrides. Built from the schema we just
  // loaded; the widget merges these with its defaults.
  //
  // What this configures per column:
  //  - `wrapText` + `autoHeight`: long values wrap and rows grow to fit.
  //  - `minWidth`: keeps columns readable when the user resizes.
  //  - **Required-field markers**: headerName gets `*`, `headerClass` adds a
  //    red tint, and `cellClassRules` paints empty required cells in red so
  //    the user can see what's missing before clicking "Insert Records".
  //
  // IMPORTANT: this `useMemo` must live BEFORE any early returns, otherwise
  // React's hooks-order invariant breaks when `loading` flips.
  const columnConfig = useMemo(() => {
    if (!schema) return undefined
    const cfg: Record<string, ColDef> = {}
    // `schema.fields` can be missing when the backend returns a sparse
    // entity (e.g. some choice-set IDs return without a fields array).
    // We route choice sets to ChoiceSetDetail at App level so this loop
    // shouldn't run for them, but guard anyway to avoid a hard crash.
    for (const field of schema.fields ?? []) {
      const isRequired = field.isRequired && !field.isSystemField
      const label = field.displayName || field.name
      const colDef: ColDef = {
        wrapText: true,
        autoHeight: true,
        minWidth: 140,
        // Required fields get an asterisk appended to the header. We
        // intentionally don't tint required headers/cells red — the `*`
        // alone is enough of a hint, and red highlighting got noisy on
        // entities where most columns are required.
        headerName: isRequired ? `${label} *` : label,
        headerTooltip: isRequired ? `${label} (required)` : label,
        // Keep cellStyle minimal — the widget's inline editor mounts inside
        // each cell, and any layout properties (display, flex, padding) on
        // the cell push the editor input into a second line and can prevent
        // value commits. Only style what's needed for the *display* state.
        cellStyle: {
          whiteSpace: 'normal',
          lineHeight: '1.4',
        },
        tooltipValueGetter: (params) =>
          params.value == null ? '' : String(params.value),
      }
      // The widget keys columnConfig by `f.displayName`. Register under
      // both displayName and name so the lookup matches in either case.
      cfg[label] = colDef
      if (field.name !== label) cfg[field.name] = colDef
    }

    // Hijack the Id column to be a clickable "inspect" link. Clicking it
    // opens RowInspector, which loads the full record via getRecordById and
    // shows ALL fields including system metadata (CreatedTime, UpdatedBy,
    // etc. — the widget filters those out of the main grid).
    cfg['Id'] = {
      headerName: 'Id',
      minWidth: 300,
      cellRenderer: (params: { value: string }) => (
        <button
          type="button"
          onClick={() => setInspectingId(params.value)}
          className="text-primary hover:underline font-mono text-xs cursor-pointer"
          title="Inspect record details"
        >
          {params.value}
        </button>
      ),
    }
    return cfg
  }, [schema])

  if (error) {
    return (
      <div className="flex-1 overflow-auto p-8">
        <Alert variant="destructive">
          <AlertTitle>Couldn't load this entity</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  // While the schema loads, render a skeleton-based layout instead of a
  // full-page spinner. The user sees the page immediately, the schema usually
  // resolves in a few hundred ms, then the widget takes over with its own
  // loading state inside the table area. Avoids the jarring spinner → spinner
  // → table flicker.
  if (loading || !schema) {
    return <EntityDetailSkeleton />
  }

  const unsupportedReason = entityNotSupportedReason(schema)
  const showTypeBadge =
    unsupportedReason || (schema.entityType && schema.entityType !== 'Entity')
  const badgeLabel = isVirtualDataObject(schema) ? 'VDO' : schema.entityType
  const badgeTooltip = isVirtualDataObject(schema)
    ? 'Virtual Data Object — sourced from external systems via joins'
    : entityTypeTooltip(schema.entityType)

  // Editable fields for the modal form — drop system fields only. Attachment
  // (File-type) fields are kept; the RecordEditor handles them with a file
  // picker + upload/download/delete buttons.
  const editableFields = schema.fields.filter((f) => !f.isSystemField)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 flex flex-col h-full">
        {/* Page header with a Quick-add button on the right.
            The widget's own "Add Row" stays visible for bulk-style inline
            editing; this modal-based button is for single-record adds with
            up-front required-field validation. */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <EntityHeader
            schema={schema}
            showTypeBadge={!!showTypeBadge}
            badgeLabel={badgeLabel}
            badgeTooltip={badgeTooltip}
          />
          {!unsupportedReason && schema.entityType !== 'ChoiceSet' && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                disabled={exporting}
                onClick={async () => {
                  // Records aren't pre-loaded with the schema (the widget
                  // owns its own data fetch). Fetch on demand here so we
                  // don't double the network cost on every page load.
                  // `reloadRecords()` returns the freshly fetched array so
                  // we don't have to wait for React's next render.
                  setExporting(true)
                  try {
                    const list = await reloadRecords()
                    if (!list.length) {
                      toast.info('Nothing to export — table is empty')
                      return
                    }
                    exportRecordsAsCsv(
                      `${schema.name}.csv`,
                      schema.fields,
                      list,
                    )
                    toast.success(`Exported ${list.length} records`)
                  } finally {
                    setExporting(false)
                  }
                }}
                title="Export records to CSV"
              >
                <Download className="h-4 w-4 mr-1.5" />
                {exporting ? 'Exporting…' : 'Export CSV'}
              </Button>
              <Button variant="outline" onClick={triggerWidgetRefresh}>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Refresh
              </Button>
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add data
              </Button>
            </div>
          )}
        </div>

        {/* Schema (collapsible) */}
        <details className="mb-6 rounded-lg border bg-card">
          <summary className="cursor-pointer px-4 py-2 text-sm font-medium">
            Schema ({schema.fields.length} fields)
          </summary>
          <div className="border-t px-4 py-2 text-sm">
            <SchemaTable fields={schema.fields} />
          </div>
        </details>

        {/* Content varies by entity kind */}
        {schema.entityType === 'ChoiceSet' ? (
          <ChoiceSetView choiceSetId={entityId} />
        ) : unsupportedReason ? (
          <Alert>
            <AlertTitle>Records aren't viewable here</AlertTitle>
            <AlertDescription>{unsupportedReason}</AlertDescription>
          </Alert>
        ) : (
          // Official UiPath widget — owns the entire records UI.
          // Docs: https://www.npmjs.com/package/@uipath/ui-widgets-datatable
          //
          // Height: the records area lives inside a flex column (the
          // wrapping `<div className="p-6 flex flex-col h-full">`), so
          // `flex-1` makes the table grow to fill whatever vertical space the
          // header + schema panel above leave behind. AG Grid needs a
          // definite height — `h-full` on the parent + `flex-1` here gives
          // it one. `min-h-[480px]` keeps it usable on short screens.
          //
          // Theme notes: the widget hard-codes ag-grid's Quartz theme; our
          // `--ag-*` overrides in src/index.css (esp. in `.dark`) flip the
          // colours to match the rest of the app's dark mode.
          <div className="rounded-lg border bg-card overflow-hidden flex-1 min-h-[480px]">
            <DataTable
              sdk={sdk}
              entityId={entityId}
              pageSize={50}
              // Show the primary key column. Other system fields
              // (CreatedTime, UpdatedTime, CreatedBy, UpdatedBy) are
              // filtered out at the widget level — see the widget's
              // useEntityData hook which does `fields.filter(f => !f.isSystemField)`.
              showIdColumn={true}
              columnConfig={columnConfig}
            />
          </div>
        )}
      </div>

      {creating && (
        <RecordEditor
          entityId={entityId}
          entityDisplayName={schema.displayName || schema.name}
          fields={editableFields}
          initial={null}
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false)
            // Reload schema + records so the widget shows the new row.
            await reload()
          }}
        />
      )}

      {inspectingId && (
        <RowInspector
          entityId={entityId}
          recordId={inspectingId}
          schema={schema}
          onClose={() => setInspectingId(null)}
        />
      )}
    </div>
  )
}

/**
 * Programmatically clicks the widget's hidden "Refresh" button to make the
 * grid re-fetch records. We hide that button via CSS and surface our own
 * Refresh in the page header instead, so the action sits next to "Add data".
 */
function triggerWidgetRefresh() {
  const refreshBtn = Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      '.uipath-datatable-container button',
    ),
  ).find((b) => b.textContent?.trim() === 'Refresh')
  refreshBtn?.click()
}

function EntityHeader({
  schema,
  showTypeBadge,
  badgeLabel,
  badgeTooltip,
}: {
  schema: EntitySchema
  showTypeBadge: boolean
  badgeLabel: string | undefined
  badgeTooltip: string
}) {
  // No outer `mb-6` here — the parent layout in EntityDetail already wraps
  // this in a flex row with its own bottom margin.
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-2xl font-semibold truncate">
          {schema.displayName || schema.name}
        </h2>
        {showTypeBadge && badgeLabel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary">{badgeLabel}</Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              {badgeTooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {schema.description && (
        <p className="text-sm text-muted-foreground mt-1">
          {schema.description}
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-2">
        <span className="font-mono">{schema.name}</span>
        {' · '}
        {schema.fields.length} field
        {schema.fields.length === 1 ? '' : 's'}
      </p>
    </div>
  )
}

function SchemaTable({ fields }: { fields: EntitySchema['fields'] }) {
  return (
    <table className="w-full">
      <thead className="text-left text-xs text-muted-foreground">
        <tr>
          <th className="py-1 pr-4">Name</th>
          <th className="py-1 pr-4">Type</th>
          <th className="py-1 pr-4">Required</th>
          <th className="py-1 pr-4">System</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((f) => (
          <tr key={f.id} className="border-t">
            <td className="py-1 pr-4 font-mono text-xs">{f.name}</td>
            <td className="py-1 pr-4 text-xs">
              {f.fieldDataType?.name ?? '—'}
            </td>
            <td className="py-1 pr-4 text-xs">{f.isRequired ? 'yes' : 'no'}</td>
            <td className="py-1 pr-4 text-xs">
              {f.isSystemField ? 'yes' : 'no'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Skeleton placeholder rendered while the entity schema loads.
 * Same overall layout as the loaded state — title row, schema panel hint, and
 * a large rectangle where the records table will appear — so the page doesn't
 * jump when content fills in.
 */
function EntityDetailSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 flex flex-col h-full">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-10 w-full mb-6" />
        <Skeleton className="flex-1 min-h-[460px] w-full" />
      </div>
    </div>
  )
}

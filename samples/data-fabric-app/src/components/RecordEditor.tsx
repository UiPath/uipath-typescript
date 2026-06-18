import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from '@uipath/apollo-wind/components/ui/sonner'
import { ChoiceSets, Entities } from '@uipath/uipath-typescript/entities'
import type { ChoiceSetGetResponse } from '@uipath/uipath-typescript/entities'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { useAuth } from '../context/AuthContext'
import type { EntityField } from '../hooks/useEntity'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@uipath/apollo-wind/components/ui/dialog'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert'

interface Props {
  entityId: string
  entityDisplayName?: string
  fields: EntityField[]
  onClose: () => void
  onSaved: () => Promise<void> | void
}

/**
 * Modal form for creating a single entity record.
 *
 * SDK calls used:
 *  - `Entities.insertRecordById(entityId, payload)` — the new record
 *  - `Entities.uploadAttachment(...)` — chained after the insert for any
 *    File-type fields (the attachment endpoint needs the new record's Id)
 *  - `ChoiceSets.getById(choiceSetId)` — populates the picker for fields
 *    that reference a choice set
 *
 * Edits to existing records happen through the data-table widget's native
 * inline-edit + "Show Diff → Commit Changes" flow, not via this modal.
 */
export function RecordEditor({
  entityId,
  entityDisplayName,
  fields,
  onClose,
  onSaved,
}: Props) {
  const { sdk } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const regularFields = useMemo(
    () => fields.filter((f) => !f.isAttachment),
    [fields],
  )
  const attachmentFields = useMemo(
    () => fields.filter((f) => f.isAttachment),
    [fields],
  )

  const initialState = useMemo(() => {
    const state: Record<string, unknown> = {}
    for (const f of regularFields) state[f.name] = ''
    return state
  }, [regularFields])
  const [values, setValues] = useState<Record<string, unknown>>(initialState)
  const [files, setFiles] = useState<Record<string, File>>({})

  // Choice-set values keyed by the choice-set id, loaded once when the
  // modal opens so the picker renders synchronously thereafter.
  const choiceSetIds = useMemo(
    () =>
      Array.from(
        new Set(
          regularFields
            .map((f) => choiceSetIdFor(f))
            .filter((id): id is string => !!id),
        ),
      ),
    [regularFields],
  )
  const [choiceSetValues, setChoiceSetValues] = useState<
    Record<string, ChoiceSetGetResponse[]>
  >({})

  useEffect(() => {
    if (choiceSetIds.length === 0) return
    let cancelled = false
    const load = async () => {
      const choiceSetService = new ChoiceSets(sdk)
      const next: Record<string, ChoiceSetGetResponse[]> = {}
      for (const id of choiceSetIds) {
        try {
          const { items } = await choiceSetService.getById(id, { pageSize: 100 })
          next[id] = items
        } catch (err) {
          console.error(`Failed to load choice set ${id}:`, err)
          next[id] = []
        }
      }
      if (!cancelled) setChoiceSetValues(next)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [sdk, choiceSetIds])

  const update = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    for (const f of regularFields) {
      if (!f.isRequired) continue
      const v = values[f.name]
      if (v === '' || v === null || v === undefined) errors[f.name] = 'Required'
    }
    for (const f of attachmentFields) {
      if (f.isRequired && !files[f.name]) errors[f.name] = 'Required'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!validate()) {
      setError('Please fill all required fields.')
      return
    }

    setSaving(true)
    try {
      const entityService = new Entities(sdk)

      const payload: Record<string, unknown> = {}
      for (const f of regularFields) {
        const raw = values[f.name]
        if (raw === '' || raw === undefined || raw === null) continue
        payload[f.name] = coerce(raw, f.fieldDataType?.name)
      }

      // `insertRecordById` returns `EntityInsertResponse extends EntityRecord`,
      // so `Id` is guaranteed to be present.
      const result = await entityService.insertRecordById(entityId, payload)
      const recordId = result.Id

      // Upload attachments. Each is a separate API call against the new
      // record id; we don't fail the whole save if one fails.
      for (const [fieldName, file] of Object.entries(files)) {
        try {
          await entityService.uploadAttachment(entityId, recordId, fieldName, file)
        } catch (err) {
          toast.error(`Upload ${fieldName} failed`, {
            description:
              err instanceof UiPathError ? err.message : 'Unknown error',
          })
        }
      }

      toast.success('Record created')
      await onSaved()
    } catch (err) {
      setError(err instanceof UiPathError ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const subtitle = `Add a new ${entityDisplayName ?? 'record'}`

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* Height capping lives in DialogContent — see ui/dialog.tsx. We just
          declare width here. */}
      <DialogContent className="sm:max-w-lg gap-0">
        <DialogHeader className="shrink-0 pb-4">
          <DialogTitle>New record</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        <form
          id="record-editor-form"
          onSubmit={handleSubmit}
          // `min-h-0` is critical: without it, flex items default to
          // `min-height: auto` (= intrinsic content height), so flex-1
          // can't actually shrink and the overflow-y-auto scroll never
          // engages.
          className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1"
          noValidate
        >
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {fields.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No editable fields on this entity.
            </div>
          )}

          {regularFields.map((f) => (
            <FieldInput
              key={f.id}
              field={f}
              value={values[f.name]}
              error={fieldErrors[f.name]}
              choiceSetValues={
                choiceSetValues[choiceSetIdFor(f) ?? ''] ?? null
              }
              onChange={(v) => update(f.name, v)}
            />
          ))}

          {attachmentFields.map((f) => (
            <AttachmentField
              key={f.id}
              field={f}
              pickedFile={files[f.name]}
              error={fieldErrors[f.name]}
              onPick={(file) =>
                setFiles((prev) => {
                  const next = { ...prev }
                  if (file) next[f.name] = file
                  else delete next[f.name]
                  return next
                })
              }
            />
          ))}
        </form>

        <DialogFooter className="mt-6 shrink-0">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="record-editor-form" disabled={saving}>
            {saving ? 'Saving…' : 'Create record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Returns the choice-set id this field references, or null if it doesn't. */
function choiceSetIdFor(field: EntityField): string | null {
  const f = field as { choiceSetId?: string; referenceChoiceSet?: { id?: string } }
  return f.choiceSetId ?? f.referenceChoiceSet?.id ?? null
}

/** Any of the SDK's date-shaped types (DATE, DATETIME, DATETIME_WITH_TZ). */
function isDateLike(type: string): boolean {
  return type === 'DATE' || type === 'DATETIME' || type === 'DATETIME_WITH_TZ'
}

function FieldInput({
  field,
  value,
  error,
  choiceSetValues,
  onChange,
}: {
  field: EntityField
  value: unknown
  error?: string
  choiceSetValues: ChoiceSetGetResponse[] | null
  onChange: (v: unknown) => void
}) {
  const rawType = field.fieldDataType?.name?.toUpperCase?.() ?? 'STRING'
  const type = choiceSetIdFor(field) ? 'CHOICESET' : rawType
  const id = `field-${field.id}`
  const label = field.displayName || field.name

  const inputClass = `w-full rounded-md border ${error ? 'border-destructive' : 'border-input'} bg-background px-3 py-1.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 ${error ? 'focus-visible:ring-destructive' : 'focus-visible:ring-ring'}`

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {label}
        {field.isRequired && (
          <span className="text-destructive ml-1" aria-hidden>
            *
          </span>
        )}
        <span className="ml-2 text-xs text-muted-foreground">{type}</span>
      </label>
      {renderInputForType(
        type,
        id,
        value,
        onChange,
        inputClass,
        choiceSetValues,
      )}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

function AttachmentField({
  field,
  pickedFile,
  error,
  onPick,
}: {
  field: EntityField
  pickedFile?: File
  error?: string
  onPick: (file: File | null) => void
}) {
  const id = `field-${field.id}`
  const label = field.displayName || field.name

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {label}
        {field.isRequired && (
          <span className="text-destructive ml-1" aria-hidden>
            *
          </span>
        )}
        <span className="ml-2 text-xs text-muted-foreground">FILE</span>
      </label>
      <input
        id={id}
        type="file"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        className="block text-sm text-foreground file:mr-3 file:py-1 file:px-2 file:rounded file:border file:border-input file:bg-background file:text-sm file:font-medium hover:file:bg-accent"
      />
      {pickedFile && (
        <p className="text-xs text-muted-foreground mt-1">
          {pickedFile.name} · {(pickedFile.size / 1024).toFixed(1)} KB
        </p>
      )}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

function renderInputForType(
  type: string,
  id: string,
  value: unknown,
  onChange: (v: unknown) => void,
  className: string,
  choiceSetValues: ChoiceSetGetResponse[] | null,
) {
  if (type === 'CHOICESET') {
    // Picker populated from `ChoiceSets.getById()` for whatever choice set
    // this field references. While the values are still loading we show a
    // disabled placeholder rather than a broken-looking empty input.
    if (choiceSetValues === null) {
      return (
        <input
          id={id}
          type="text"
          value=""
          disabled
          placeholder="Loading choice set values…"
          className={className}
        />
      )
    }
    return (
      <select
        id={id}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      >
        <option value="">—</option>
        {choiceSetValues.map((v) => (
          <option key={v.id} value={v.id}>
            {v.displayName ?? v.name}
          </option>
        ))}
      </select>
    )
  }

  if (type === 'BOOLEAN') {
    return (
      <select
        id={id}
        value={value === true ? 'true' : value === false ? 'false' : ''}
        onChange={(e) => {
          const v = e.target.value
          onChange(v === 'true' ? true : v === 'false' ? false : '')
        }}
        className={className}
      >
        <option value="">—</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    )
  }

  if (
    type === 'INTEGER' ||
    type === 'DECIMAL' ||
    type === 'NUMBER' ||
    type === 'FLOAT'
  ) {
    return (
      <input
        id={id}
        type="number"
        step={type === 'INTEGER' ? '1' : 'any'}
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
    )
  }

  if (isDateLike(type)) {
    const isDate = type === 'DATE'
    return (
      <input
        id={id}
        type={isDate ? 'date' : 'datetime-local'}
        // The browser inputs want YYYY-MM-DD (date) or YYYY-MM-DDTHH:mm
        // (datetime-local). Slicing a longer string keeps it valid even
        // when the SDK returns an ISO 8601 string with timezone offset
        // (e.g. DATETIME_WITH_TZ → "2024-10-22T17:00:00+00:00").
        value={
          typeof value === 'string' ? value.slice(0, isDate ? 10 : 16) : ''
        }
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
    )
  }

  return (
    <input
      id={id}
      type="text"
      value={value === null || value === undefined ? '' : String(value)}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    />
  )
}

function coerce(raw: unknown, typeName?: string): unknown {
  const type = typeName?.toUpperCase?.() ?? 'STRING'
  if (raw === '' || raw === null || raw === undefined) return null
  if (type === 'INTEGER') {
    const n = parseInt(String(raw), 10)
    return Number.isFinite(n) ? n : raw
  }
  if (type === 'DECIMAL' || type === 'NUMBER' || type === 'FLOAT') {
    const n = parseFloat(String(raw))
    return Number.isFinite(n) ? n : raw
  }
  if (type === 'BOOLEAN') {
    if (raw === true || raw === 'true') return true
    if (raw === false || raw === 'false') return false
    return null
  }
  if (type === 'DATE') {
    // Date is date-only (no time / TZ). Browser input gives YYYY-MM-DD —
    // pass through unchanged.
    return String(raw)
  }
  if (type === 'DATETIME' || type === 'DATETIME_WITH_TZ') {
    // Browser `<input type="datetime-local">` produces YYYY-MM-DDTHH:mm in
    // the user's LOCAL timezone, with no zone suffix. The Data Fabric
    // server expects an ISO 8601 instant. We parse as local then
    // serialize as UTC ISO so the server interprets it correctly.
    const d = new Date(String(raw))
    return Number.isFinite(d.getTime()) ? d.toISOString() : String(raw)
  }
  return raw
}

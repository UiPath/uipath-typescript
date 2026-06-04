import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { Download, Paperclip, Trash2 } from 'lucide-react'
import { Entities } from '@uipath/uipath-typescript/entities'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { useAuth } from '../hooks/useAuth'
import type { EntityField, EntityRow } from '../hooks/useEntity'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { downloadBlobAsFile } from '../lib/download'

interface Props {
  entityId: string
  entityDisplayName?: string
  fields: EntityField[]
  initial: EntityRow | null
  onClose: () => void
  onSaved: () => Promise<void> | void
}

/**
 * Modal form for creating or editing a single entity record.
 *
 * SDK calls used:
 *  - `Entities.insertRecordById(entityId, payload)` for new records
 *  - `Entities.updateRecordById(entityId, recordId, payload)` for edits
 *  - `Entities.uploadAttachment(entityId, recordId, fieldName, file)` for
 *    File-type field uploads (chained after the record save so we have an Id)
 *  - `Entities.downloadAttachment(...)` and `deleteAttachment(...)` for
 *    existing attachments in edit mode
 *
 * Validation is client-side: required fields with empty values short-circuit
 * with an inline error before any network call.
 */
export function RecordEditor({
  entityId,
  entityDisplayName,
  fields,
  initial,
  onClose,
  onSaved,
}: Props) {
  const { sdk } = useAuth()
  const isEdit = !!initial
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Split fields by kind so we can render them differently.
  const regularFields = useMemo(
    () => fields.filter((f) => !f.isAttachment),
    [fields],
  )
  const attachmentFields = useMemo(
    () => fields.filter((f) => f.isAttachment),
    [fields],
  )

  // State for plain field values (text/number/boolean/date).
  const initialState = useMemo(() => {
    const state: Record<string, unknown> = {}
    for (const f of regularFields) {
      state[f.name] = initial?.[f.name] ?? ''
    }
    return state
  }, [regularFields, initial])
  const [values, setValues] = useState<Record<string, unknown>>(initialState)

  // Attachments state: file picked for upload (keyed by fieldName), and a
  // set of fields whose existing attachment should be deleted on save.
  const [files, setFiles] = useState<Record<string, File>>({})
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set())

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
    // Required attachment fields: must have either an existing value (edit
    // mode, not pending-deleted) OR a newly picked file.
    for (const f of attachmentFields) {
      if (!f.isRequired) continue
      const hasExisting =
        isEdit && initial?.[f.name] && !pendingDeletes.has(f.name)
      const hasNew = !!files[f.name]
      if (!hasExisting && !hasNew) errors[f.name] = 'Required'
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
      const svc = new Entities(sdk)

      // 1. Save scalar fields first; we need a recordId before we can upload
      // any attachments.
      const payload: Record<string, unknown> = {}
      for (const f of regularFields) {
        const raw = values[f.name]
        if (raw === '' || raw === undefined || raw === null) {
          if (isEdit) payload[f.name] = null
          continue
        }
        payload[f.name] = coerce(raw, f.fieldDataType?.name)
      }

      let recordId: string
      if (isEdit && initial) {
        await svc.updateRecordById(entityId, initial.Id, payload)
        recordId = initial.Id
      } else {
        const result = (await svc.insertRecordById(
          entityId,
          payload,
        )) as { Id?: string } & EntityRow
        recordId = result.Id || (result as EntityRow).Id
      }

      // 2. Delete attachments the user removed in edit mode.
      for (const fieldName of pendingDeletes) {
        try {
          await svc.deleteAttachment(entityId, recordId, fieldName)
        } catch (err) {
          console.error(`Delete attachment ${fieldName} failed:`, err)
        }
      }

      // 3. Upload new files. Each attachment is a separate API call.
      for (const [fieldName, file] of Object.entries(files)) {
        try {
          await svc.uploadAttachment(entityId, recordId, fieldName, file)
        } catch (err) {
          // Don't fail the whole save — record was saved, attachment was the
          // separate step. Surface the failure clearly.
          toast.error(`Upload ${fieldName} failed`, {
            description:
              err instanceof UiPathError ? err.message : 'Unknown error',
          })
        }
      }

      toast.success(isEdit ? 'Record updated' : 'Record created')
      await onSaved()
    } catch (err) {
      setError(err instanceof UiPathError ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async (fieldName: string) => {
    if (!initial) return
    try {
      const svc = new Entities(sdk)
      const blob = await svc.downloadAttachment(
        entityId,
        initial.Id,
        fieldName,
      )
      downloadBlobAsFile(blob, fieldName)
    } catch (err) {
      toast.error('Download failed', {
        description: err instanceof UiPathError ? err.message : 'Unknown error',
      })
    }
  }

  const title = isEdit ? 'Edit record' : 'New record'
  const subtitle =
    isEdit && initial
      ? `Editing ${entityDisplayName ?? 'record'} · ${initial.Id}`
      : `Add a new ${entityDisplayName ?? 'record'}`

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        <form
          id="record-editor-form"
          onSubmit={handleSubmit}
          className="space-y-4 max-h-[60vh] overflow-y-auto pr-1"
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
              onChange={(v) => update(f.name, v)}
            />
          ))}

          {attachmentFields.map((f) => (
            <AttachmentField
              key={f.id}
              field={f}
              isEdit={isEdit}
              hasExisting={
                !!initial?.[f.name] && !pendingDeletes.has(f.name)
              }
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
              onDelete={() =>
                setPendingDeletes((prev) => {
                  const next = new Set(prev)
                  next.add(f.name)
                  return next
                })
              }
              onDownload={() => handleDownload(f.name)}
            />
          ))}
        </form>

        <DialogFooter>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="record-editor-form"
            disabled={saving}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: EntityField
  value: unknown
  error?: string
  onChange: (v: unknown) => void
}) {
  const type = field.fieldDataType?.name?.toUpperCase?.() ?? 'STRING'
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
      {renderInputForType(type, id, value, onChange, inputClass)}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

function AttachmentField({
  field,
  isEdit,
  hasExisting,
  pickedFile,
  error,
  onPick,
  onDelete,
  onDownload,
}: {
  field: EntityField
  isEdit: boolean
  hasExisting: boolean
  pickedFile?: File
  error?: string
  onPick: (file: File | null) => void
  onDelete: () => void
  onDownload: () => void
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

      <div className="space-y-2">
        {/* Existing attachment row (edit mode only) */}
        {isEdit && hasExisting && (
          <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-muted/40">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="flex-1 text-muted-foreground italic">
              Existing attachment
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDownload}
              className="h-7"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Download
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-7 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* File picker (always shown — for new uploads / replacements) */}
        <div>
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
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  )
}

function renderInputForType(
  type: string,
  id: string,
  value: unknown,
  onChange: (v: unknown) => void,
  className: string,
) {
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

  if (type === 'DATE' || type === 'DATETIME') {
    return (
      <input
        id={id}
        type={type === 'DATE' ? 'date' : 'datetime-local'}
        value={value ? String(value).slice(0, 16) : ''}
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
  if (type === 'DATE' || type === 'DATETIME') {
    return String(raw)
  }
  return raw
}

// Renders a normalized task schema (see lib/taskSchema.ts) as a native form:
// inputs read-only, inOuts/outputs editable, outcomes as submit buttons.
// Owns the draft values; the parent owns the SDK calls (complete / save).
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { FileText } from 'lucide-react'
import { Alert, AlertDescription } from '@uipath/apollo-wind/components/ui/alert'
import { Button } from '@uipath/apollo-wind/components/ui/button'
import { Checkbox } from '@uipath/apollo-wind/components/ui/checkbox'
import { Input } from '@uipath/apollo-wind/components/ui/input'
import { Label } from '@uipath/apollo-wind/components/ui/label'
import { Textarea } from '@uipath/apollo-wind/components/ui/textarea'
import { Badge } from '@uipath/apollo-wind/components/ui/badge'
import { formatDateTime } from '../taskUtils'
import type { FieldKind, TaskFormField, TaskFormModel, TaskFormOutcome } from '../taskSchema'

interface Props {
  model: TaskFormModel
  /** Current task data. Inputs are shown from here; editable fields start from here. */
  initialData: Record<string, unknown>
  /** Completed tasks render every field read-only and hide the outcome buttons. */
  readOnly: boolean
  busy: boolean
  error?: string | null
  onSubmit: (outcome: TaskFormOutcome, data: Record<string, unknown>) => void
  /** When provided, a "Save draft" button persists values without completing. */
  onSave?: (data: Record<string, unknown>) => void
}

const EDITABLE_SECTIONS = new Set(['inOuts', 'outputs'])

/** Kinds whose empty editor state means "no value", not an empty string. */
const NULL_WHEN_BLANK = new Set<FieldKind>(['date', 'datetime', 'file'])

/** A default value per kind so React inputs are always controlled. */
function defaultFor(field: TaskFormField): unknown {
  switch (field.kind) {
    case 'boolean':
      return false
    case 'integer':
    case 'number':
      return ''
    case 'object':
      return Object.fromEntries((field.children ?? []).map((c) => [c.key, defaultFor(c)]))
    case 'array':
    case 'table':
      return []
    case 'json':
    case 'date':
    case 'datetime':
    case 'file':
      // No value yet — not an empty string. `toDateInput` renders null as '',
      // so the controls stay controlled either way.
      return null
    default:
      return ''
  }
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

/** Every required field that is still empty, including required children of objects. */
function missingRequired(fields: TaskFormField[], values: Record<string, unknown>): string[] {
  const missing: string[] = []
  for (const f of fields) {
    const value = values[f.key]
    if (f.kind === 'object') {
      const nested = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
      missing.push(...missingRequired(f.children ?? [], nested).map((label) => `${f.label} › ${label}`))
      if (f.required && Object.keys(nested).length === 0) missing.push(f.label)
      continue
    }
    if (f.required && isEmpty(value)) missing.push(f.label)
  }
  return missing
}

/** Coerce an edited value to what the workflow expects for the field's kind. */
function coerce(field: TaskFormField, value: unknown): unknown {
  switch (field.kind) {
    case 'integer': {
      if (value === '' || value === null || value === undefined) return null
      const n = Number(value)
      return Number.isFinite(n) ? n : null
    }
    case 'number': {
      if (value === '' || value === null || value === undefined) return null
      const n = Number(value)
      return Number.isFinite(n) ? n : null
    }
    case 'boolean':
      return Boolean(value)
    case 'object': {
      const obj = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
      return Object.fromEntries((field.children ?? []).map((c) => [c.key, coerce(c, obj[c.key])]))
    }
    default:
      if (value === undefined) return null
      // An untouched date/file control holds '' — send null rather than a bogus empty value.
      if (value === '' && NULL_WHEN_BLANK.has(field.kind)) return null
      return value
  }
}

/**
 * Date-ish values arrive as ISO strings; the inputs need `YYYY-MM-DD` /
 * `YYYY-MM-DDTHH:mm`. A date-only string is passed through verbatim — running it
 * through `Date` would parse it as UTC midnight and shift the day for anyone
 * west of UTC.
 */
function toDateInput(value: unknown, withTime: boolean): string {
  if (typeof value !== 'string' || !value) return ''
  const dateOnly = /^(\d{4}-\d{2}-\d{2})$/.exec(value)
  if (dateOnly) return withTime ? `${dateOnly[1]}T00:00` : dateOnly[1]
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return withTime ? `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}` : date
}

/** Formats a date for display without the UTC-parse day shift. */
function formatDateValue(value: unknown): string {
  const s = String(value ?? '')
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (parts) {
    const local = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))
    return local.toLocaleDateString()
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

function fileLabel(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  const o = value as Record<string, unknown>
  return String(o.Name ?? o.name ?? o.FileName ?? o.fileName ?? o.ID ?? o.id ?? JSON.stringify(value))
}

/** Read-only rendering of a value for the given kind. */
export function ValueView({ kind, value }: { kind: FieldKind; value: unknown }) {
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>
  switch (kind) {
    case 'boolean':
      return <Badge variant={value ? 'success' : 'secondary'}>{value ? 'Yes' : 'No'}</Badge>
    case 'date':
      return <span className="font-medium">{formatDateValue(value)}</span>
    case 'datetime':
      return <span className="font-medium">{formatDateTime(String(value))}</span>
    case 'file':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs font-medium">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[16rem] truncate">{fileLabel(value)}</span>
        </span>
      )
    default:
      break
  }
  if (typeof value === 'object') {
    return (
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/60 p-2 font-mono text-[11px] leading-relaxed">
        {JSON.stringify(value, null, 2)}
      </pre>
    )
  }
  return <span className="font-medium break-words">{String(value)}</span>
}

/**
 * Integer fields the reviewer has filled with a fraction. The server types these
 * as Int32/Int64, so this is a validation error — silently truncating would
 * submit a number the reviewer never entered.
 */
function fractionalIntegers(fields: TaskFormField[], values: Record<string, unknown>): string[] {
  const bad: string[] = []
  for (const f of fields) {
    if (f.kind === 'object') {
      const nested = (values[f.key] && typeof values[f.key] === 'object' ? values[f.key] : {}) as Record<string, unknown>
      bad.push(...fractionalIntegers(f.children ?? [], nested).map((label) => `${f.label} › ${label}`))
      continue
    }
    if (f.kind !== 'integer') continue
    const v = values[f.key]
    if (v === '' || v === null || v === undefined) continue
    const n = Number(v)
    if (Number.isFinite(n) && !Number.isInteger(n)) bad.push(f.label)
  }
  return bad
}

/** True when a string field should get a textarea rather than a single-line input. */
function isLongText(value: unknown): boolean {
  const s = value === null || value === undefined ? '' : String(value)
  return s.length > 80 || s.includes('\n')
}

/**
 * Editable widget for one field. Objects recurse; arrays/tables/json edit as JSON
 * text. `path` namespaces DOM ids and JSON-draft keys so a nested child never
 * collides with a top-level field of the same name.
 */
function FieldEditor({
  field,
  path,
  value,
  onChange,
  disabled,
  multiline,
  jsonText,
  onJsonText,
}: {
  field: TaskFormField
  path: string
  value: unknown
  onChange: (next: unknown) => void
  disabled: boolean
  /** Fixed at mount from the initial value, so the widget never swaps mid-typing. */
  multiline: boolean
  jsonText: Record<string, string>
  onJsonText: (key: string, text: string) => void
}) {
  const id = `tf-${path}`
  switch (field.kind) {
    case 'boolean':
      return (
        <label htmlFor={id} className="flex items-center gap-2 text-sm">
          <Checkbox id={id} checked={Boolean(value)} onCheckedChange={(c) => onChange(c === true)} disabled={disabled} />
          {value ? 'Yes' : 'No'}
        </label>
      )
    case 'integer':
    case 'number':
      return (
        <Input
          id={id}
          type="number"
          step={field.kind === 'integer' ? 1 : 'any'}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={disabled}
        />
      )
    case 'date':
      return (
        <Input
          id={id}
          type="date"
          value={toDateInput(value, false)}
          onChange={(e) => onChange(e.target.value || '')}
          disabled={disabled}
        />
      )
    case 'datetime':
      return (
        <Input
          id={id}
          type="datetime-local"
          value={toDateInput(value, true)}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
          disabled={disabled}
        />
      )
    case 'file':
      // File inputs are produced by the automation; editing them needs an upload
      // flow (Attachments / Buckets) that is out of scope for this sample.
      return <ValueView kind="file" value={value} />
    case 'object': {
      const obj = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
      return (
        <div className="grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2">
          {(field.children ?? []).map((child) => (
            <FieldRow key={child.key} field={child} path={`${path}.${child.key}`}>
              <FieldEditor
                field={child}
                path={`${path}.${child.key}`}
                value={obj[child.key]}
                onChange={(next) => onChange({ ...obj, [child.key]: next })}
                disabled={disabled}
                multiline={isLongText(obj[child.key])}
                jsonText={jsonText}
                onJsonText={onJsonText}
              />
            </FieldRow>
          ))}
        </div>
      )
    }
    case 'array':
    case 'table':
    case 'json': {
      const text = jsonText[path] ?? (value === undefined || value === null ? '' : JSON.stringify(value, null, 2))
      let invalid = false
      if (text.trim()) {
        try {
          JSON.parse(text)
        } catch {
          invalid = true
        }
      }
      return (
        <div className="space-y-1">
          <Textarea
            id={id}
            value={text}
            rows={Math.min(10, Math.max(3, text.split('\n').length))}
            spellCheck={false}
            className={`font-mono text-xs ${invalid ? 'border-destructive' : ''}`}
            placeholder={field.kind === 'json' ? '{ }' : '[ ]'}
            onChange={(e) => {
              const t = e.target.value
              onJsonText(path, t)
              if (!t.trim()) {
                onChange(field.kind === 'json' ? null : [])
                return
              }
              try {
                onChange(JSON.parse(t))
              } catch {
                // keep the last valid value until the text parses again
              }
            }}
            disabled={disabled}
          />
          {invalid && <p className="text-xs text-destructive">Not valid JSON</p>}
        </div>
      )
    }
    default: {
      const s = value === null || value === undefined ? '' : String(value)
      return multiline ? (
        <Textarea id={id} value={s} rows={4} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      ) : (
        <Input id={id} type="text" value={s} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      )
    }
  }
}

function FieldRow({
  field,
  path,
  children,
  wide,
}: {
  field: TaskFormField
  path: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className={`min-w-0 ${wide ? 'sm:col-span-2' : ''}`}>
      <Label htmlFor={`tf-${path}`} className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span className="truncate">{field.label}</span>
        {field.required && <span className="text-destructive">*</span>}
        {field.rawType && <span className="rounded bg-muted px-1 py-0.5 text-[9px] normal-case">{field.rawType}</span>}
      </Label>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  )
}

const WIDE_KINDS = new Set<FieldKind>(['object', 'array', 'table', 'json'])

export function TaskForm({ model, initialData, readOnly, busy, error, onSubmit, onSave }: Props) {
  const inputs = useMemo(() => model.fields.filter((f) => f.section === 'inputs'), [model])
  const editable = useMemo(() => model.fields.filter((f) => EDITABLE_SECTIONS.has(f.section)), [model])

  // Editable values start from the task data, falling back to a per-kind default
  // so every control is controlled. Outputs are usually absent until the reviewer
  // fills them in, which is exactly what the default covers.
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(
      editable.map((f) => [f.key, initialData[f.key] !== undefined ? initialData[f.key] : defaultFor(f)]),
    ),
  )
  const [jsonText, setJsonText] = useState<Record<string, string>>({})

  // Whether a string field renders as a textarea is decided once, from the value
  // the form opened with. Deriving it from the live value would swap the element
  // as the reviewer crosses the threshold and drop keyboard focus mid-word.
  const multiline = useMemo(
    () => new Set(editable.filter((f) => isLongText(initialData[f.key])).map((f) => f.key)),
    [editable, initialData],
  )

  const missing = missingRequired(editable, values)
  const fractional = fractionalIntegers(editable, values)
  const invalidJson = Object.values(jsonText).some((t) => {
    if (!t.trim()) return false
    try {
      JSON.parse(t)
      return false
    } catch {
      return true
    }
  })

  const collect = (): Record<string, unknown> => ({
    // Inputs travel back untouched; only editable sections are coerced.
    ...initialData,
    ...Object.fromEntries(editable.map((f) => [f.key, coerce(f, values[f.key])])),
  })

  const outcomes: TaskFormOutcome[] =
    model.outcomes.length > 0 ? model.outcomes : [{ key: 'Submit', label: 'Submit', primary: true }]
  const canSubmit = !readOnly && !busy && missing.length === 0 && !invalidJson && fractional.length === 0
  const disabled = readOnly || busy

  return (
    <div className="space-y-5">
      {inputs.length > 0 && (
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</h4>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {inputs.map((f) => (
              <div key={f.key} className={WIDE_KINDS.has(f.kind) ? 'sm:col-span-2' : ''}>
                <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <span className="truncate">{f.label}</span>
                  {f.rawType && <span className="rounded bg-muted px-1 py-0.5 text-[9px] normal-case">{f.rawType}</span>}
                </dt>
                <dd className="mt-0.5 text-sm">
                  <ValueView kind={f.kind} value={initialData[f.key]} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {editable.length > 0 && (
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {readOnly ? 'Submitted values' : 'Your input'}
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {editable.map((f) => (
              <FieldRow key={f.key} field={f} path={f.key} wide={WIDE_KINDS.has(f.kind) || multiline.has(f.key)}>
                {readOnly ? (
                  <ValueView kind={f.kind} value={values[f.key]} />
                ) : (
                  <FieldEditor
                    field={f}
                    path={f.key}
                    value={values[f.key]}
                    onChange={(next) => setValues((v) => ({ ...v, [f.key]: next }))}
                    disabled={disabled}
                    multiline={multiline.has(f.key)}
                    jsonText={jsonText}
                    onJsonText={(key, text) => setJsonText((j) => ({ ...j, [key]: text }))}
                  />
                )}
              </FieldRow>
            ))}
          </div>
        </section>
      )}

      {inputs.length === 0 && editable.length === 0 && (
        <p className="text-sm text-muted-foreground">This form has no fields — only a decision.</p>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          {outcomes.map((o) => (
            <Button
              key={o.key}
              variant={o.primary ? 'default' : 'outline'}
              onClick={() => onSubmit(o, collect())}
              disabled={!canSubmit}
            >
              {busy ? 'Submitting…' : o.label}
            </Button>
          ))}
          {onSave && editable.length > 0 && (
            <Button variant="ghost" onClick={() => onSave(collect())} disabled={busy || invalidJson || fractional.length > 0}>
              Save draft
            </Button>
          )}
          {missing.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">Required: {missing.join(', ')}</span>
          )}
          {fractional.length > 0 && (
            <span className="ml-auto text-xs text-destructive">Whole numbers only: {fractional.join(', ')}</span>
          )}
        </div>
      )}
    </div>
  )
}

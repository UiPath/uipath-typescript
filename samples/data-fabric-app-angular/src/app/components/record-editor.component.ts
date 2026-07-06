import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core'
import type { AfterViewInit, OnDestroy, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ChoiceSets, Entities } from '@uipath/uipath-typescript/entities'
import type {
  ChoiceSetGetResponse,
  EntityRecord,
  FieldMetaData,
} from '@uipath/uipath-typescript/entities'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { AuthService } from '../core/auth.service'
import { ToastService } from '../core/toast.service'
import { recordFieldValue } from '../lib/format'
import { IconX } from './icons'

type FieldValues = Record<string, unknown>

/** Zero-pads a date/time component to two digits. */
const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Formats a Date as the `YYYY-MM-DDTHH:mm` local-time string that
 * `<input type="datetime-local">` expects — the inverse of `coerce()`'s
 * local-parse → UTC-serialise round trip.
 */
function toDateTimeLocalInputValue(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/**
 * Modal form for creating or editing a single entity record.
 *
 * SDK calls used:
 *  - `Entities.insertRecordById(entityId, payload)` — create mode
 *  - `Entities.updateRecordById(entityId, recordId, payload)` — edit mode
 *  - `Entities.uploadAttachment(...)` — chained after the save for any
 *    File-type fields (the attachment endpoint needs the record's Id)
 *  - `Entities.deleteAttachment(...)` — "Remove" on an existing attachment
 *  - `ChoiceSets.getById(choiceSetId)` — populates the picker for fields
 *    that reference a choice set
 */
@Component({
  selector: 'app-record-editor',
  imports: [FormsModule, IconX],
  styles: `
    .dialog { max-width: 520px; }
    .dialog-close {
      position: absolute;
      top: 14px;
      right: 14px;
      border: none;
      background: none;
      color: var(--muted-foreground);
      cursor: pointer;
      padding: 4px;
      display: inline-flex;
    }
    .dialog-close:hover { color: var(--foreground); }
    .dialog { position: relative; }
    .form-fields { display: flex; flex-direction: column; gap: 14px; }
    .field-label {
      display: block;
      font-size: 13.5px;
      font-weight: 500;
      margin-bottom: 4px;
    }
    .required-star { color: var(--destructive); margin-left: 3px; }
    .field-type {
      margin-left: 8px;
      font-size: 11px;
      color: var(--muted-foreground);
      font-weight: 400;
    }
    .field-error { font-size: 11.5px; color: var(--destructive); margin-top: 3px; }
    .file-hint { font-size: 11.5px; color: var(--muted-foreground); margin-top: 3px; }
    .attachment-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .save-error { margin-bottom: 14px; }
    input[type='file'] { font-size: 13px; color: var(--foreground); }
  `,
  template: `
    <div
      class="dialog-backdrop"
      (mousedown)="onBackdropMouseDown($event)"
      (click)="onBackdropClick($event)"
    >
      <div class="dialog" #dialogRoot tabindex="-1" role="dialog" aria-modal="true">
        <button type="button" class="dialog-close" aria-label="Close" (click)="closed.emit()">
          <icon-x />
        </button>
        <div>
          <h2 class="dialog-title">{{ isEdit() ? 'Edit record' : 'New record' }}</h2>
          <p class="dialog-description">
            {{
              isEdit()
                ? 'Update this ' + (entityDisplayName() || 'record')
                : 'Add a new ' + (entityDisplayName() || 'record')
            }}
          </p>
        </div>

        <form class="dialog-body" (submit)="onSubmit($event)" novalidate>
          @if (saveError(); as err) {
            <div class="alert alert-destructive save-error">
              <div class="alert-description">{{ err }}</div>
            </div>
          }

          @if (fields().length === 0) {
            <div class="text-muted" style="font-size: 13.5px">
              No editable fields on this entity.
            </div>
          }

          <div class="form-fields">
            @for (field of regularFields(); track field.id) {
              <div>
                <label class="field-label" [for]="'field-' + field.id">
                  {{ field.displayName || field.name }}
                  @if (field.isRequired) {
                    <span class="required-star" aria-hidden="true">*</span>
                  }
                  <span class="field-type">{{ inputKind(field) }}</span>
                </label>

                @switch (inputKind(field)) {
                  @case ('CHOICESET') {
                    @if (choiceValuesFor(field); as choiceValues) {
                      <select
                        class="select"
                        [class.input-error]="fieldErrors()[field.name]"
                        [id]="'field-' + field.id"
                        [ngModel]="stringValue(field)"
                        [ngModelOptions]="{ standalone: true }"
                        (ngModelChange)="setValue(field, $event)"
                      >
                        <option value="">—</option>
                        @for (choice of choiceValues; track choice.id) {
                          <option [value]="choice.id">
                            {{ choice.displayName || choice.name }}
                          </option>
                        }
                      </select>
                    } @else {
                      <input
                        class="input"
                        type="text"
                        disabled
                        placeholder="Loading choice set values…"
                      />
                    }
                  }
                  @case ('BOOLEAN') {
                    <select
                      class="select"
                      [class.input-error]="fieldErrors()[field.name]"
                      [id]="'field-' + field.id"
                      [ngModel]="stringValue(field)"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="setBoolean(field, $event)"
                    >
                      <option value="">—</option>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  }
                  @case ('NUMBER') {
                    <input
                      class="input"
                      type="number"
                      [step]="numberStep(field)"
                      [class.input-error]="fieldErrors()[field.name]"
                      [id]="'field-' + field.id"
                      [ngModel]="stringValue(field)"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="setValue(field, $event)"
                    />
                  }
                  @case ('DATE') {
                    <input
                      class="input"
                      type="date"
                      [class.input-error]="fieldErrors()[field.name]"
                      [id]="'field-' + field.id"
                      [ngModel]="stringValue(field)"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="setValue(field, $event)"
                    />
                  }
                  @case ('DATETIME') {
                    <input
                      class="input"
                      type="datetime-local"
                      [class.input-error]="fieldErrors()[field.name]"
                      [id]="'field-' + field.id"
                      [ngModel]="stringValue(field)"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="setValue(field, $event)"
                    />
                  }
                  @default {
                    <input
                      class="input"
                      type="text"
                      [class.input-error]="fieldErrors()[field.name]"
                      [id]="'field-' + field.id"
                      [ngModel]="stringValue(field)"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="setValue(field, $event)"
                    />
                  }
                }
                @if (fieldErrors()[field.name]; as fieldError) {
                  <p class="field-error">{{ fieldError }}</p>
                }
              </div>
            }

            @for (field of attachmentFields(); track field.id) {
              <div>
                <label class="field-label" [for]="'field-' + field.id">
                  {{ field.displayName || field.name }}
                  @if (field.isRequired) {
                    <span class="required-star" aria-hidden="true">*</span>
                  }
                  <span class="field-type">FILE</span>
                </label>
                <div class="attachment-row">
                  <input
                    [id]="'field-' + field.id"
                    type="file"
                    (change)="onFilePicked(field, $event)"
                  />
                  @if (isEdit() && hasExistingAttachment(field)) {
                    <button
                      type="button"
                      class="btn btn-outline btn-sm"
                      [disabled]="removingAttachment() === field.name"
                      (click)="removeAttachment(field)"
                    >
                      {{
                        removingAttachment() === field.name
                          ? 'Removing…'
                          : 'Remove current attachment'
                      }}
                    </button>
                  }
                </div>
                @if (pickedFiles()[field.name]; as file) {
                  <p class="file-hint">
                    {{ file.name }} · {{ (file.size / 1024).toFixed(1) }} KB
                  </p>
                }
                @if (fieldErrors()[field.name]; as fieldError) {
                  <p class="field-error">{{ fieldError }}</p>
                }
              </div>
            }
          </div>
        </form>

        <div class="dialog-footer">
          <button type="button" class="btn btn-ghost" (click)="closed.emit()">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            [disabled]="saving()"
            (click)="save()"
          >
            {{
              saving()
                ? 'Saving…'
                : isEdit()
                  ? 'Save changes'
                  : 'Create record'
            }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class RecordEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService)
  private readonly toast = inject(ToastService)

  readonly entityId = input.required<string>()
  readonly entityDisplayName = input<string>()
  readonly fields = input.required<FieldMetaData[]>()
  /** When provided, the editor runs in edit mode against this record. */
  readonly record = input<EntityRecord | null>(null)

  readonly closed = output<void>()
  readonly saved = output<void>()

  readonly saving = signal(false)
  readonly saveError = signal<string | null>(null)
  readonly fieldErrors = signal<Record<string, string>>({})
  readonly values = signal<FieldValues>({})
  readonly pickedFiles = signal<Record<string, File>>({})
  readonly removingAttachment = signal<string | null>(null)
  /**
   * Field names whose existing attachment was deleted in this session.
   * Tracked locally instead of mutating the parent-owned `record()` input —
   * in-place mutation bypasses the signal graph and would silently stop
   * re-rendering under OnPush/zoneless change detection.
   */
  readonly removedAttachments = signal<ReadonlySet<string>>(new Set())

  /**
   * Choice-set values keyed by choice-set id, loaded once when the modal
   * opens so the pickers render synchronously thereafter. `null` per key
   * while loading.
   */
  readonly choiceSetValues = signal<Record<string, ChoiceSetGetResponse[]>>({})
  readonly choiceSetsLoaded = signal(false)

  private readonly dialogRoot =
    viewChild.required<ElementRef<HTMLElement>>('dialogRoot')
  /** Element to restore focus to when the dialog closes. */
  private readonly previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  /**
   * Whether the current click gesture STARTED on the backdrop. Checking the
   * click target alone closes the dialog when a text-selection drag that
   * began inside a form field is released over the backdrop — silently
   * discarding everything the user typed.
   */
  private mouseDownOnBackdrop = false

  readonly isEdit = computed(() => this.record() !== null)
  readonly regularFields = computed(() =>
    this.fields().filter((f) => !f.isAttachment),
  )
  readonly attachmentFields = computed(() =>
    this.fields().filter((f) => f.isAttachment),
  )

  ngOnInit(): void {
    this.values.set(this.initialValues())
    void this.loadChoiceSets()
  }

  ngAfterViewInit(): void {
    this.dialogRoot().nativeElement.focus()
  }

  ngOnDestroy(): void {
    this.previouslyFocused?.focus()
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit()
  }

  /** Returns the choice-set id this field references, or null. */
  private choiceSetIdFor(field: FieldMetaData): string | null {
    return field.choiceSetId ?? field.referenceChoiceSet?.id ?? null
  }

  /**
   * Classifies a field into the input widget it needs. Choice-set fields
   * win over their raw data type; numbers collapse into one NUMBER kind.
   */
  inputKind(field: FieldMetaData): string {
    if (this.choiceSetIdFor(field)) return 'CHOICESET'
    const raw = field.fieldDataType.name.toUpperCase()
    if (raw === 'BOOLEAN') return 'BOOLEAN'
    if (['INTEGER', 'DECIMAL', 'NUMBER', 'FLOAT'].includes(raw)) return 'NUMBER'
    if (raw === 'DATE') return 'DATE'
    if (raw === 'DATETIME' || raw === 'DATETIME_WITH_TZ') return 'DATETIME'
    return raw
  }

  numberStep(field: FieldMetaData): string {
    return field.fieldDataType.name.toUpperCase() === 'INTEGER' ? '1' : 'any'
  }

  choiceValuesFor(field: FieldMetaData): ChoiceSetGetResponse[] | null {
    if (!this.choiceSetsLoaded()) return null
    const id = this.choiceSetIdFor(field)
    return id ? (this.choiceSetValues()[id] ?? []) : []
  }

  /** Current value as the string the HTML input expects. */
  stringValue(field: FieldMetaData): string {
    const value = this.values()[field.name]
    if (value === null || value === undefined) return ''
    if (typeof value === 'boolean') return String(value)
    const kind = this.inputKind(field)
    if (kind === 'DATE' && typeof value === 'string') return value.slice(0, 10)
    // `<input type="datetime-local">` wants YYYY-MM-DDTHH:mm in the user's
    // LOCAL timezone. The server value is an ISO 8601 instant (often with a
    // timezone offset), so format its local components — the exact inverse
    // of `coerce()`, which parses the input as local time and serialises to
    // UTC. Slicing the ISO string instead would reinterpret the UTC wall
    // time as local and shift the value by the UTC offset on every save.
    if (kind === 'DATETIME' && typeof value === 'string') {
      const parsed = new Date(value)
      if (Number.isFinite(parsed.getTime())) {
        return toDateTimeLocalInputValue(parsed)
      }
      return value.slice(0, 16)
    }
    if (typeof value === 'object') {
      // Choice-set / reference values come back as objects in edit mode —
      // pre-select by their id when possible.
      const obj = value as { id?: string; Id?: string }
      return obj.id ?? obj.Id ?? ''
    }
    return String(value)
  }

  setValue(field: FieldMetaData, value: unknown): void {
    this.values.update((prev) => ({ ...prev, [field.name]: value }))
    this.clearFieldError(field.name)
  }

  setBoolean(field: FieldMetaData, value: string): void {
    this.setValue(field, value === 'true' ? true : value === 'false' ? false : '')
  }

  onFilePicked(field: FieldMetaData, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null
    this.pickedFiles.update((prev) => {
      const next = { ...prev }
      if (file) next[field.name] = file
      else delete next[field.name]
      return next
    })
    this.clearFieldError(field.name)
  }

  hasExistingAttachment(field: FieldMetaData): boolean {
    const record = this.record()
    if (!record || this.removedAttachments().has(field.name)) return false
    const value = recordFieldValue(record, field)
    return value != null && value !== ''
  }

  /** Deletes the record's existing attachment for this field immediately. */
  async removeAttachment(field: FieldMetaData): Promise<void> {
    const record = this.record()
    if (!record) return
    this.removingAttachment.set(field.name)
    try {
      const entityService = new Entities(this.auth.sdk)
      await entityService.deleteAttachment(this.entityId(), record.Id, field.name)
      // Reflect the removal locally so the "Remove" button disappears.
      this.removedAttachments.update((prev) => new Set(prev).add(field.name))
      this.toast.success(`Removed ${field.displayName || field.name}`)
    } catch (err) {
      this.toast.error(
        'Remove failed',
        err instanceof UiPathError ? err.message : 'Unknown error',
      )
    } finally {
      this.removingAttachment.set(null)
    }
  }

  onBackdropMouseDown(event: MouseEvent): void {
    this.mouseDownOnBackdrop = event.target === event.currentTarget
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.mouseDownOnBackdrop && event.target === event.currentTarget) {
      this.closed.emit()
    }
    this.mouseDownOnBackdrop = false
  }

  onSubmit(event: Event): void {
    event.preventDefault()
    void this.save()
  }

  async save(): Promise<void> {
    // Re-entrancy guard: the footer button disables while saving, but the
    // form's implicit submission (Enter in a text field) is not disabled —
    // without this, a double Enter inserts the record twice.
    if (this.saving()) return
    this.saveError.set(null)
    if (!this.validate()) {
      this.saveError.set('Please fill all required fields.')
      return
    }

    this.saving.set(true)
    try {
      const entityService = new Entities(this.auth.sdk)

      const payload: Record<string, unknown> = {}
      for (const field of this.regularFields()) {
        const raw = this.values()[field.name]
        if (raw === '' || raw === undefined || raw === null) {
          // Create mode: omit untouched fields entirely. Edit mode: send an
          // explicit null so clearing a field actually clears it server-side
          // — omitting it would silently keep the old value.
          if (this.isEdit()) payload[field.name] = null
          continue
        }
        payload[field.name] = this.coerce(raw, field)
      }

      const existing = this.record()
      let recordId: string
      if (existing) {
        await entityService.updateRecordById(this.entityId(), existing.Id, payload)
        recordId = existing.Id
      } else {
        // `insertRecordById` returns `EntityInsertResponse extends
        // EntityRecord`, so `Id` is guaranteed to be present.
        const result = await entityService.insertRecordById(this.entityId(), payload)
        recordId = result.Id
      }

      // Upload attachments. Each is a separate API call against the record
      // id; we don't fail the whole save if one fails.
      for (const [fieldName, file] of Object.entries(this.pickedFiles())) {
        try {
          await entityService.uploadAttachment(
            this.entityId(),
            recordId,
            fieldName,
            file,
          )
        } catch (err) {
          this.toast.error(
            `Upload ${fieldName} failed`,
            err instanceof UiPathError ? err.message : 'Unknown error',
          )
        }
      }

      this.saved.emit()
    } catch (err) {
      this.saveError.set(
        err instanceof UiPathError ? err.message : 'Save failed',
      )
    } finally {
      this.saving.set(false)
    }
  }

  private validate(): boolean {
    const errors: Record<string, string> = {}
    for (const field of this.regularFields()) {
      if (!field.isRequired) continue
      const value = this.values()[field.name]
      if (value === '' || value === null || value === undefined) {
        errors[field.name] = 'Required'
      }
    }
    for (const field of this.attachmentFields()) {
      if (
        field.isRequired &&
        !this.pickedFiles()[field.name] &&
        !this.hasExistingAttachment(field)
      ) {
        errors[field.name] = 'Required'
      }
    }
    this.fieldErrors.set(errors)
    return Object.keys(errors).length === 0
  }

  private clearFieldError(name: string): void {
    if (this.fieldErrors()[name]) {
      this.fieldErrors.update((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  private initialValues(): FieldValues {
    const state: FieldValues = {}
    const record = this.record()
    for (const field of this.regularFields()) {
      const existing = record ? recordFieldValue(record, field) : undefined
      state[field.name] = existing ?? ''
    }
    return state
  }

  private coerce(raw: unknown, field: FieldMetaData): unknown {
    const kind = this.inputKind(field)
    if (kind === 'CHOICESET') {
      // The picker stores the choice value's id (a string) — pass through.
      return this.stringValue(field) || null
    }
    if (kind === 'NUMBER') {
      const type = field.fieldDataType.name.toUpperCase()
      const n =
        type === 'INTEGER' ? parseInt(String(raw), 10) : parseFloat(String(raw))
      return Number.isFinite(n) ? n : raw
    }
    if (kind === 'BOOLEAN') {
      if (raw === true || raw === 'true') return true
      if (raw === false || raw === 'false') return false
      return null
    }
    if (kind === 'DATE') {
      // Date is date-only (no time / TZ). Browser input gives YYYY-MM-DD —
      // pass through unchanged.
      return String(raw).slice(0, 10)
    }
    if (kind === 'DATETIME') {
      // Browser `<input type="datetime-local">` produces YYYY-MM-DDTHH:mm in
      // the user's LOCAL timezone, with no zone suffix. The Data Fabric
      // server expects an ISO 8601 instant. We parse as local then
      // serialize as UTC ISO so the server interprets it correctly.
      const d = new Date(String(raw))
      return Number.isFinite(d.getTime()) ? d.toISOString() : String(raw)
    }
    return raw
  }

  private async loadChoiceSets(): Promise<void> {
    const ids = Array.from(
      new Set(
        this.regularFields()
          .map((f) => this.choiceSetIdFor(f))
          .filter((id): id is string => !!id),
      ),
    )
    if (ids.length === 0) {
      this.choiceSetsLoaded.set(true)
      return
    }
    const choiceSetService = new ChoiceSets(this.auth.sdk)
    const next: Record<string, ChoiceSetGetResponse[]> = {}
    // Independent API calls — fetch all referenced choice sets in parallel.
    // A single failed set degrades to an empty picker without blocking the
    // others.
    const results = await Promise.allSettled(
      ids.map((id) => choiceSetService.getById(id, { pageSize: 100 })),
    )
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        next[ids[index]] = result.value.items
      } else {
        console.error(`Failed to load choice set ${ids[index]}:`, result.reason)
        next[ids[index]] = []
      }
    })
    this.choiceSetValues.set(next)
    this.choiceSetsLoaded.set(true)
  }
}

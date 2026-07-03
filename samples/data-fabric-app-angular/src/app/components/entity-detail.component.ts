import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core'
import { Entities } from '@uipath/uipath-typescript/entities'
import type { EntityGetResponse, EntityRecord } from '@uipath/uipath-typescript/entities'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { AuthService } from '../core/auth.service'
import { ToastService } from '../core/toast.service'
import {
  entityNotSupportedReason,
  entityTypeTooltip,
  isReadOnlyEntity,
  isVirtualDataObject,
} from '../lib/entity-types'
import { exportRecordsAsCsv } from '../lib/csv-export'
import { RecordsTableComponent } from './records-table.component'
import { RecordEditorComponent } from './record-editor.component'
import { RowInspectorComponent } from './row-inspector.component'
import { ChoiceSetViewComponent } from './choice-set-view.component'
import { IconDownload, IconPlus, IconRefresh, IconTrash } from './icons'

/**
 * Right-pane detail view for one entity.
 *
 * Rendering branches by entity kind:
 *  - **Regular Entity** → full CRUD UI: records grid with sorting +
 *    pagination, Add data modal, per-row Edit modal, batch delete via row
 *    selection, CSV export, Row Inspector.
 *  - **ChoiceSet** → dedicated read-only viewer via the ChoiceSets service.
 *  - **VDO / InternalEntity** → friendly "not viewable" notice.
 *  - **SystemEntity** → records grid in read-only mode (no edit/add/delete).
 *
 * SDK calls: `Entities.getById` (schema), `Entities.getAllRecords`
 * (cursor-looped to fetch every page), `Entities.deleteRecordsById`
 * (batch delete of the selected rows). Insert/update/attachments live in
 * `RecordEditorComponent`; `getRecordById` + `downloadAttachment` live in
 * `RowInspectorComponent`.
 */
@Component({
  selector: 'app-entity-detail',
  imports: [
    RecordsTableComponent,
    RecordEditorComponent,
    RowInspectorComponent,
    ChoiceSetViewComponent,
    IconDownload,
    IconPlus,
    IconRefresh,
    IconTrash,
  ],
  styles: `
    :host { flex: 1; min-width: 0; overflow-y: auto; display: block; }
    .detail { padding: 24px; display: flex; flex-direction: column; min-height: 100%; }
    .detail-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
    }
    .detail-heading { min-width: 0; }
    .title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .title { font-size: 22px; font-weight: 600; }
    .description { font-size: 13.5px; color: var(--muted-foreground); margin-top: 4px; }
    .meta { font-size: 12px; color: var(--muted-foreground); margin-top: 8px; }
    .actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
    details.schema {
      margin-bottom: 24px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--card);
    }
    details.schema summary {
      cursor: pointer;
      padding: 8px 16px;
      font-size: 13.5px;
      font-weight: 500;
    }
    .schema-body {
      border-top: 1px solid var(--border);
      padding: 8px 16px;
      overflow-x: auto;
    }
    .schema-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .schema-table th {
      text-align: left;
      padding: 4px 16px 4px 0;
      font-size: 11.5px;
      font-weight: 500;
      color: var(--muted-foreground);
    }
    .schema-table td { padding: 4px 16px 4px 0; border-top: 1px solid var(--border); }
    .records-area { flex: 1; min-height: 0; display: flex; flex-direction: column; }
    .records-area app-records-table { flex: 1; min-height: 0; display: flex; flex-direction: column; }
    .skeleton-header { margin-bottom: 24px; display: flex; flex-direction: column; gap: 8px; }
  `,
  template: `
    @if (error(); as err) {
      <div class="detail">
        <div class="alert alert-destructive">
          <div class="alert-title">Couldn't load this entity</div>
          <div class="alert-description">{{ err }}</div>
        </div>
      </div>
    } @else if (loading() || !schema()) {
      <!-- Skeleton layout matching the loaded state so the page doesn't jump. -->
      <div class="detail">
        <div class="skeleton-header">
          <span class="skeleton" style="height: 32px; width: 33%"></span>
          <span class="skeleton" style="height: 16px; width: 50%"></span>
          <span class="skeleton" style="height: 12px; width: 160px"></span>
        </div>
        <span class="skeleton" style="height: 40px; width: 100%; margin-bottom: 24px"></span>
        <span class="skeleton" style="flex: 1; min-height: 460px; width: 100%"></span>
      </div>
    } @else {
      <div class="detail">
        <div class="detail-top">
          <div class="detail-heading">
            <div class="title-row">
              <h2 class="title truncate">
                {{ schema()!.displayName || schema()!.name }}
              </h2>
              @if (badgeLabel(); as badge) {
                <span class="badge badge-secondary" [title]="badgeTooltip()">
                  {{ badge }}
                </span>
              }
              @if (readOnly()) {
                <span
                  class="badge badge-outline"
                  title="This entity is managed by the platform — records can be viewed but not edited, added, or deleted."
                >
                  Read-only
                </span>
              }
            </div>
            @if (schema()!.description) {
              <p class="description">{{ schema()!.description }}</p>
            }
            <p class="meta">
              <span class="mono">{{ schema()!.name }}</span>
              · {{ schema()!.fields.length }}
              field{{ schema()!.fields.length === 1 ? '' : 's' }}
            </p>
          </div>

          @if (!unsupportedReason() && schema()!.entityType !== 'ChoiceSet') {
            <div class="actions">
              @if (!readOnly() && selectedIds().length > 0) {
                <button
                  type="button"
                  class="btn btn-destructive"
                  [disabled]="deleting()"
                  (click)="deleteSelected()"
                >
                  <icon-trash />
                  {{
                    deleting()
                      ? 'Deleting…'
                      : 'Delete (' + selectedIds().length + ')'
                  }}
                </button>
              }
              <button
                type="button"
                class="btn btn-outline"
                title="Export records to CSV"
                [disabled]="exporting()"
                (click)="exportCsv()"
              >
                <icon-download />
                {{ exporting() ? 'Exporting…' : 'Export CSV' }}
              </button>
              <button
                type="button"
                class="btn btn-outline"
                [disabled]="recordsLoading()"
                (click)="loadRecords()"
              >
                <icon-refresh [class.spin]="recordsLoading()" />
                Refresh
              </button>
              <!-- "Add data" is hidden for read-only entities (e.g.
                   SystemEntity) — the records are queryable but not mutable. -->
              @if (!readOnly()) {
                <button type="button" class="btn btn-primary" (click)="creating.set(true)">
                  <icon-plus />
                  Add data
                </button>
              }
            </div>
          }
        </div>

        <!-- Schema (collapsible) -->
        <details class="schema">
          <summary>Schema ({{ schema()!.fields.length }} fields)</summary>
          <div class="schema-body">
            <table class="schema-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>System</th>
                </tr>
              </thead>
              <tbody>
                @for (field of schema()!.fields; track field.id) {
                  <tr>
                    <td class="mono" style="font-size: 12px">{{ field.name }}</td>
                    <td>{{ field.fieldDataType.name || '—' }}</td>
                    <td>{{ field.isRequired ? 'yes' : 'no' }}</td>
                    <td>{{ field.isSystemField ? 'yes' : 'no' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </details>

        <!-- Content varies by entity kind -->
        @if (schema()!.entityType === 'ChoiceSet') {
          <app-choice-set-view [choiceSetId]="entityId()" />
        } @else if (unsupportedReason(); as reason) {
          <div class="alert">
            <div class="alert-title">Records aren't viewable here</div>
            <div class="alert-description">{{ reason }}</div>
          </div>
        } @else {
          <div class="records-area">
            <app-records-table
              [fields]="schema()!.fields"
              [records]="records()"
              [loading]="recordsLoading()"
              [error]="recordsError()"
              [readOnly]="readOnly()"
              (inspect)="inspectingId.set($event)"
              (edit)="editingRecord.set($event)"
              (selectionChange)="selectedIds.set($event)"
            />
          </div>
        }
      </div>

      @if (creating()) {
        <app-record-editor
          [entityId]="entityId()"
          [entityDisplayName]="schema()!.displayName || schema()!.name"
          [fields]="editableFields()"
          (closed)="creating.set(false)"
          (saved)="onEditorSaved('created')"
        />
      }

      @if (editingRecord(); as record) {
        <app-record-editor
          [entityId]="entityId()"
          [entityDisplayName]="schema()!.displayName || schema()!.name"
          [fields]="editableFields()"
          [record]="record"
          (closed)="editingRecord.set(null)"
          (saved)="onEditorSaved('updated')"
        />
      }

      @if (inspectingId(); as recordId) {
        <app-row-inspector
          [entityId]="entityId()"
          [recordId]="recordId"
          [schema]="schema()!"
          (closed)="inspectingId.set(null)"
        />
      }
    }
  `,
})
export class EntityDetailComponent {
  private readonly auth = inject(AuthService)
  private readonly toast = inject(ToastService)

  readonly entityId = input.required<string>()

  readonly schema = signal<EntityGetResponse | null>(null)
  readonly loading = signal(false)
  readonly error = signal<string | null>(null)

  readonly records = signal<EntityRecord[]>([])
  readonly recordsLoading = signal(false)
  readonly recordsError = signal<string | null>(null)

  readonly exporting = signal(false)
  readonly deleting = signal(false)

  // `creating` opens the Add data modal, `editingRecord` the same modal in
  // edit mode, `inspectingId` the read-only Row Inspector (trigger: click
  // the Id cell in the records table).
  readonly creating = signal(false)
  readonly editingRecord = signal<EntityRecord | null>(null)
  readonly inspectingId = signal<string | null>(null)
  readonly selectedIds = signal<string[]>([])

  readonly unsupportedReason = computed(() => {
    const schema = this.schema()
    return schema ? entityNotSupportedReason(schema) : null
  })

  readonly readOnly = computed(() => {
    const schema = this.schema()
    return !!schema && isReadOnlyEntity(schema)
  })

  readonly badgeLabel = computed(() => {
    const schema = this.schema()
    if (!schema) return null
    if (isVirtualDataObject(schema)) return 'VDO'
    if (schema.entityType && schema.entityType !== 'Entity') {
      return schema.entityType
    }
    return null
  })

  readonly badgeTooltip = computed(() => {
    const schema = this.schema()
    if (!schema) return ''
    return isVirtualDataObject(schema)
      ? 'Virtual Data Object — sourced from external systems via joins'
      : entityTypeTooltip(schema.entityType)
  })

  /**
   * Editable fields for the modal form — drop system fields only.
   * Attachment (File-type) fields are kept; the RecordEditor handles them
   * with a file picker + upload/delete buttons.
   */
  readonly editableFields = computed(() =>
    (this.schema()?.fields ?? []).filter((f) => !f.isSystemField),
  )

  constructor() {
    // Reload whenever the selected entity changes.
    effect(() => {
      const id = this.entityId()
      untracked(() => void this.reload(id))
    })
  }

  async reload(entityId = this.entityId()): Promise<void> {
    this.loading.set(true)
    this.error.set(null)
    this.schema.set(null)
    this.records.set([])
    this.recordsError.set(null)
    this.creating.set(false)
    this.editingRecord.set(null)
    this.inspectingId.set(null)
    this.selectedIds.set([])
    try {
      const entityService = new Entities(this.auth.sdk)
      const entity = await entityService.getById(entityId)
      this.schema.set(entity)
      // Unlike the React sample (where the data-table widget owns the record
      // fetch), this app renders its own grid — so load the records here.
      await this.loadRecords()
    } catch (err) {
      this.error.set(
        err instanceof UiPathError ? err.message : 'Failed to load entity',
      )
    } finally {
      this.loading.set(false)
    }
  }

  /**
   * Fetches ALL records for the current entity and returns them.
   *
   * Each `getAllRecords` call returns ONE server-capped page — passing no
   * options does NOT return every row. Loop the cursor and accumulate so
   * the full record set is available to the grid and to CSV export (which
   * must not silently truncate large entities to the first page).
   */
  async loadRecords(): Promise<EntityRecord[]> {
    const schema = this.schema()
    if (!schema || entityNotSupportedReason(schema)) {
      // VDOs, InternalEntity, ChoiceSet — the records endpoint doesn't
      // apply. The UI shows a friendly notice instead.
      this.records.set([])
      return []
    }
    this.recordsLoading.set(true)
    this.recordsError.set(null)
    try {
      const entityService = new Entities(this.auth.sdk)
      const allRecords: EntityRecord[] = []
      let page = await entityService.getAllRecords(this.entityId(), {
        pageSize: 100,
      })
      allRecords.push(...page.items)
      while (page.hasNextPage && page.nextCursor) {
        page = await entityService.getAllRecords(this.entityId(), {
          cursor: page.nextCursor,
        })
        allRecords.push(...page.items)
      }
      this.records.set(allRecords)
      return allRecords
    } catch (err) {
      this.recordsError.set(
        err instanceof UiPathError ? err.message : 'Failed to load records',
      )
      return []
    } finally {
      this.recordsLoading.set(false)
    }
  }

  async exportCsv(): Promise<void> {
    const schema = this.schema()
    if (!schema) return
    this.exporting.set(true)
    try {
      // Re-fetch so the export reflects the current server state, not a
      // stale grid.
      const list = await this.loadRecords()
      if (!list.length) {
        this.toast.info('Nothing to export — table is empty')
        return
      }
      exportRecordsAsCsv(`${schema.name}.csv`, schema.fields, list)
      this.toast.success(`Exported ${list.length} records`)
    } finally {
      this.exporting.set(false)
    }
  }

  /**
   * Batch-deletes the selected rows via `Entities.deleteRecordsById`, then
   * reloads the grid. Partial failures are reported per the SDK's
   * `successRecords` / `failureRecords` split.
   */
  async deleteSelected(): Promise<void> {
    const ids = this.selectedIds()
    if (ids.length === 0) return
    this.deleting.set(true)
    try {
      const entityService = new Entities(this.auth.sdk)
      const result = await entityService.deleteRecordsById(this.entityId(), ids)
      if (result.failureRecords.length > 0) {
        this.toast.error(
          `Failed to delete ${result.failureRecords.length} of ${ids.length} records`,
          result.failureRecords[0]?.error,
        )
      } else {
        this.toast.success(
          `Deleted ${ids.length} record${ids.length === 1 ? '' : 's'}`,
        )
      }
      this.selectedIds.set([])
      await this.loadRecords()
    } catch (err) {
      this.toast.error(
        'Delete failed',
        err instanceof UiPathError ? err.message : 'Unknown error',
      )
    } finally {
      this.deleting.set(false)
    }
  }

  async onEditorSaved(action: 'created' | 'updated'): Promise<void> {
    this.creating.set(false)
    this.editingRecord.set(null)
    this.toast.success(`Record ${action}`)
    await this.loadRecords()
  }
}

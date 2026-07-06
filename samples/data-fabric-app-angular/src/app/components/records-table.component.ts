import { Component, computed, effect, input, output, signal } from '@angular/core'
import type { EntityRecord, FieldMetaData } from '@uipath/uipath-typescript/entities'
import { formatCell } from '../lib/format'
import {
  IconChevronLeft,
  IconChevronRight,
  IconDatabase,
  IconPencil,
} from './icons'

const PAGE_SIZE = 25

/**
 * Records grid for one entity — the Angular counterpart of the React
 * sample's `@uipath/ui-widgets-datatable` widget (which is React-only).
 *
 * The full record set is fetched by the parent (`EntityDetailComponent`)
 * via `Entities.getAllRecords()`; this component handles the client-side
 * presentation: sortable columns, pagination, row selection for batch
 * delete, an Edit action per row, and a clickable `Id` cell that opens the
 * Row Inspector.
 *
 * Also used for read-only entities (e.g. SystemEntity, where every field is
 * `isSystemField: true`) — with `readOnly`, the selection and edit
 * affordances are hidden and all schema fields render as plain text.
 */
@Component({
  selector: 'app-records-table',
  imports: [IconChevronLeft, IconChevronRight, IconDatabase, IconPencil],
  styles: `
    .table-card { overflow: hidden; display: flex; flex-direction: column; }
    .table-scroll { overflow: auto; flex: 1; min-height: 0; }
    th.sortable { cursor: pointer; user-select: none; }
    th.sortable:hover { color: var(--foreground); }
    .sort-arrow { margin-left: 4px; }
    .id-link {
      border: none;
      background: none;
      padding: 0;
      color: var(--primary);
      font-family: var(--font-mono);
      font-size: 12px;
      cursor: pointer;
      text-align: left;
      /* GUIDs must never wrap — without this the table can squeeze the Id
         column to a sliver and break-word renders one character per line.
         The wrapping .table-scroll provides horizontal scrolling instead. */
      white-space: nowrap;
    }
    .id-link:hover { text-decoration: underline; }
    .checkbox-cell { width: 32px; }
    .actions-cell { width: 40px; }
    .pager {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      border-top: 1px solid var(--border);
      font-size: 12.5px;
      color: var(--muted-foreground);
      flex-shrink: 0;
    }
    .pager-buttons { display: flex; gap: 4px; }
    .skeleton-card { padding: 24px; display: flex; flex-direction: column; gap: 12px; }
    .empty-state { padding: 48px 12px; text-align: center; }
    .empty-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius);
      background: var(--muted);
      color: var(--muted-foreground);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 8px;
      font-size: 18px;
    }
  `,
  template: `
    @if (loading()) {
      <div class="card skeleton-card">
        @for (i of [1, 2, 3, 4, 5, 6]; track i) {
          <span class="skeleton" style="height: 24px; width: 100%"></span>
        }
      </div>
    } @else if (error(); as err) {
      <div class="alert alert-destructive">
        <div class="alert-title">Couldn't load records</div>
        <div class="alert-description">{{ err }}</div>
      </div>
    } @else if (records().length === 0) {
      <div class="card empty-state">
        <div class="empty-icon"><icon-database /></div>
        <span class="text-muted" style="font-size: 13.5px">
          No records to display.
        </span>
      </div>
    } @else {
      <div class="card table-card">
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                @if (!readOnly()) {
                  <th class="checkbox-cell">
                    <input
                      type="checkbox"
                      [checked]="allPageSelected()"
                      (change)="toggleSelectPage()"
                      aria-label="Select all rows on this page"
                    />
                  </th>
                }
                @for (field of orderedFields(); track field.id) {
                  <th
                    class="sortable"
                    [title]="headerTooltip(field)"
                    (click)="toggleSort(field)"
                  >
                    {{ headerLabel(field)
                    }}@if (sortField() === field.name) {<span class="sort-arrow">{{
                      sortAsc() ? '▲' : '▼'
                    }}</span>}
                  </th>
                }
                @if (!readOnly()) {
                  <th class="actions-cell"></th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of pageRecords(); track row.Id) {
                <tr>
                  @if (!readOnly()) {
                    <td class="checkbox-cell">
                      <input
                        type="checkbox"
                        [checked]="selected().has(row.Id)"
                        (change)="toggleSelect(row.Id)"
                        aria-label="Select row"
                      />
                    </td>
                  }
                  @for (field of orderedFields(); track field.id) {
                    <td [class.mono]="field.isPrimaryKey">
                      @if (field.isPrimaryKey) {
                        <button
                          type="button"
                          class="id-link"
                          title="Inspect record details"
                          (click)="inspect.emit(row.Id)"
                        >
                          {{ row.Id }}
                        </button>
                      } @else if (field.isAttachment) {
                        <span class="text-muted" style="font-style: italic">
                          {{ cellValue(row, field) === '—' ? 'no attachment' : 'attachment' }}
                        </span>
                      } @else {
                        {{ cellValue(row, field) }}
                      }
                    </td>
                  }
                  @if (!readOnly()) {
                    <td class="actions-cell">
                      <button
                        type="button"
                        class="btn btn-ghost btn-icon"
                        title="Edit record"
                        (click)="edit.emit(row)"
                      >
                        <icon-pencil />
                      </button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (pageCount() > 1) {
          <div class="pager">
            <span>
              {{ pageStart() + 1 }}–{{ pageEnd() }} of {{ records().length }}
              records
            </span>
            <div class="pager-buttons">
              <button
                type="button"
                class="btn btn-outline btn-icon"
                [disabled]="page() === 0"
                aria-label="Previous page"
                (click)="page.set(page() - 1)"
              >
                <icon-chevron-left />
              </button>
              <button
                type="button"
                class="btn btn-outline btn-icon"
                [disabled]="page() >= pageCount() - 1"
                aria-label="Next page"
                (click)="page.set(page() + 1)"
              >
                <icon-chevron-right />
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class RecordsTableComponent {
  readonly fields = input.required<FieldMetaData[]>()
  readonly records = input.required<EntityRecord[]>()
  readonly loading = input(false)
  readonly error = input<string | null>(null)
  readonly readOnly = input(false)

  /** Click on the `Id` cell — opens the Row Inspector. */
  readonly inspect = output<string>()
  /** Click on a row's Edit action — opens the Record Editor in edit mode. */
  readonly edit = output<EntityRecord>()
  /** Emits the currently-selected record ids whenever selection changes. */
  readonly selectionChange = output<string[]>()

  readonly page = signal(0)
  readonly sortField = signal<string | null>(null)
  readonly sortAsc = signal(true)
  readonly selected = signal<ReadonlySet<string>>(new Set())

  /** `Id` first, then everything else in schema order. */
  readonly orderedFields = computed(() => {
    const fields = this.fields()
    return [
      ...fields.filter((f) => f.isPrimaryKey),
      ...fields.filter((f) => !f.isPrimaryKey),
    ]
  })

  readonly sortedRecords = computed(() => {
    const records = this.records()
    const key = this.sortField()
    if (!key) return records
    const field = this.fields().find((f) => f.name === key)
    const direction = this.sortAsc() ? 1 : -1
    return [...records].sort((a, b) => {
      const av = field ? this.rawValue(a, field) : a[key]
      const bv = field ? this.rawValue(b, field) : b[key]
      if (av == null && bv == null) return 0
      if (av == null) return direction
      if (bv == null) return -direction
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * direction
      }
      return String(av).localeCompare(String(bv)) * direction
    })
  })

  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.records().length / PAGE_SIZE)),
  )
  readonly pageStart = computed(() => this.page() * PAGE_SIZE)
  readonly pageEnd = computed(() =>
    Math.min(this.pageStart() + PAGE_SIZE, this.records().length),
  )
  readonly pageRecords = computed(() =>
    this.sortedRecords().slice(this.pageStart(), this.pageEnd()),
  )

  readonly allPageSelected = computed(() => {
    const rows = this.pageRecords()
    if (rows.length === 0) return false
    const selected = this.selected()
    return rows.every((r) => selected.has(r.Id))
  })

  constructor() {
    // Reset presentation state whenever the record set is replaced (entity
    // switch or refresh) — stale selection ids must not survive a reload.
    effect(() => {
      this.records()
      this.page.set(0)
      this.clearSelection()
    })
  }

  toggleSort(field: FieldMetaData): void {
    if (this.sortField() === field.name) {
      this.sortAsc.update((v) => !v)
    } else {
      this.sortField.set(field.name)
      this.sortAsc.set(true)
    }
    this.page.set(0)
  }

  toggleSelect(id: string): void {
    const next = new Set(this.selected())
    if (next.has(id)) next.delete(id)
    else next.add(id)
    this.selected.set(next)
    this.selectionChange.emit([...next])
  }

  toggleSelectPage(): void {
    const next = new Set(this.selected())
    if (this.allPageSelected()) {
      for (const row of this.pageRecords()) next.delete(row.Id)
    } else {
      for (const row of this.pageRecords()) next.add(row.Id)
    }
    this.selected.set(next)
    this.selectionChange.emit([...next])
  }

  clearSelection(): void {
    this.selected.set(new Set())
    this.selectionChange.emit([])
  }

  headerLabel(field: FieldMetaData): string {
    const label = field.displayName || field.name
    // Required fields get an asterisk appended to the header, matching the
    // React sample's column config.
    return field.isRequired && !field.isSystemField ? `${label} *` : label
  }

  headerTooltip(field: FieldMetaData): string {
    const label = field.displayName || field.name
    return field.isRequired && !field.isSystemField
      ? `${label} (required) — click to sort`
      : `${label} — click to sort`
  }

  cellValue(row: EntityRecord, field: FieldMetaData): string {
    return formatCell(this.rawValue(row, field))
  }

  /**
   * Records come back keyed by field `name` OR `displayName` depending on
   * the entity — check both.
   */
  private rawValue(row: EntityRecord, field: FieldMetaData): unknown {
    return row[field.name] ?? (field.displayName ? row[field.displayName] : undefined)
  }
}

import {
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core'
import type { AfterViewInit, OnDestroy, OnInit } from '@angular/core'
import { Entities } from '@uipath/uipath-typescript/entities'
import type {
  EntityGetResponse,
  EntityRecord,
  FieldMetaData,
} from '@uipath/uipath-typescript/entities'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { AuthService } from '../core/auth.service'
import { ToastService } from '../core/toast.service'
import { downloadBlobAsFile } from '../lib/download'
import { recordFieldValue } from '../lib/format'
import { IconDownload, IconX } from './icons'

/**
 * Read-only "inspect" panel for a single record.
 *
 * SDK calls used:
 *  - `Entities.getRecordById(entityId, recordId)` to load the full record —
 *    including system fields like CreatedTime / UpdatedBy the main grid
 *    doesn't emphasise.
 *  - `Entities.downloadAttachment(entityId, recordId, fieldName)` for any
 *    File-type field that has an attachment.
 */
@Component({
  selector: 'app-row-inspector',
  imports: [IconDownload, IconX],
  styles: `
    .dialog { max-width: 680px; position: relative; }
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
    .record-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    .record-table td {
      padding: 8px 0;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    .record-table tr:last-child td { border-bottom: none; }
    .field-name {
      color: var(--muted-foreground);
      font-weight: 500;
      width: 33%;
      padding-right: 16px !important;
    }
    .system-tag {
      margin-left: 6px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: color-mix(in srgb, var(--muted-foreground) 70%, transparent);
    }
    .field-value { word-break: break-word; }
    .value-mono { font-family: var(--font-mono); font-size: 12px; }
    .value-empty { color: var(--muted-foreground); font-style: italic; }
    .value-object {
      font-size: 12px;
      background: var(--muted);
      padding: 8px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 0;
    }
    .skeleton-rows { display: flex; flex-direction: column; gap: 10px; }
    .skeleton-row { display: flex; gap: 12px; }
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
          <h2 class="dialog-title">Record details</h2>
          <p class="dialog-description">
            All fields including system metadata.
            <code style="font-size: 11.5px">{{ recordId() }}</code>
          </p>
        </div>

        <div class="dialog-body">
          @if (loading()) {
            <div class="skeleton-rows">
              @for (i of [1, 2, 3, 4, 5, 6]; track i) {
                <div class="skeleton-row">
                  <span class="skeleton" style="height: 16px; width: 33%"></span>
                  <span class="skeleton" style="height: 16px; flex: 1"></span>
                </div>
              }
            </div>
          } @else if (error(); as err) {
            <div class="alert alert-destructive">
              <div class="alert-title">Couldn't load this record</div>
              <div class="alert-description">{{ err }}</div>
            </div>
          } @else if (record(); as rec) {
            <table class="record-table">
              <tbody>
                @for (field of schema().fields; track field.id) {
                  <tr>
                    <td class="field-name">
                      {{ field.displayName || field.name }}
                      @if (field.isSystemField) {
                        <span class="system-tag">system</span>
                      }
                    </td>
                    <td class="field-value">
                      @if (field.isAttachment) {
                        @if (fieldValue(rec, field)) {
                          <button
                            type="button"
                            class="btn btn-outline btn-sm"
                            [disabled]="downloadingField() === field.name"
                            (click)="download(field.name)"
                          >
                            <icon-download />
                            {{
                              downloadingField() === field.name
                                ? 'Downloading…'
                                : 'Download'
                            }}
                          </button>
                        } @else {
                          <span class="value-empty">no attachment</span>
                        }
                      } @else if (isEmpty(fieldValue(rec, field))) {
                        <span class="value-empty">empty</span>
                      } @else if (isObject(fieldValue(rec, field))) {
                        <pre class="value-object">{{ pretty(fieldValue(rec, field)) }}</pre>
                      } @else {
                        <span class="value-mono">{{ fieldValue(rec, field) }}</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn btn-primary" (click)="closed.emit()">
            Close
          </button>
        </div>
      </div>
    </div>
  `,
})
export class RowInspectorComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService)
  private readonly toast = inject(ToastService)

  readonly entityId = input.required<string>()
  readonly recordId = input.required<string>()
  readonly schema = input.required<EntityGetResponse>()
  readonly closed = output<void>()

  readonly record = signal<EntityRecord | null>(null)
  readonly loading = signal(true)
  readonly error = signal<string | null>(null)
  readonly downloadingField = signal<string | null>(null)

  private readonly dialogRoot =
    viewChild.required<ElementRef<HTMLElement>>('dialogRoot')
  /** Element to restore focus to when the dialog closes. */
  private readonly previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  /**
   * Whether the current click gesture STARTED on the backdrop. Checking the
   * click target alone closes the dialog when a text-selection drag that
   * began inside the dialog is released over the backdrop.
   */
  private mouseDownOnBackdrop = false

  ngOnInit(): void {
    void this.load()
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

  /** Records come back keyed by field name OR displayName — check both. */
  fieldValue(record: EntityRecord, field: FieldMetaData): unknown {
    return recordFieldValue(record, field)
  }

  private async load(): Promise<void> {
    this.loading.set(true)
    this.error.set(null)
    try {
      const entityService = new Entities(this.auth.sdk)
      const record = await entityService.getRecordById(
        this.entityId(),
        this.recordId(),
      )
      this.record.set(record as EntityRecord)
    } catch (err) {
      this.error.set(
        err instanceof UiPathError ? err.message : 'Failed to load record',
      )
    } finally {
      this.loading.set(false)
    }
  }

  async download(fieldName: string): Promise<void> {
    this.downloadingField.set(fieldName)
    try {
      const entityService = new Entities(this.auth.sdk)
      const blob = await entityService.downloadAttachment(
        this.entityId(),
        this.recordId(),
        fieldName,
      )
      // Use the field name as filename. The blob has a `type` so the browser
      // will pick a sensible default extension, but we can't recover the
      // original filename without it being stored elsewhere.
      downloadBlobAsFile(blob, `${fieldName}${blobExtension(blob)}`)
      this.toast.success(`Downloaded ${fieldName}`)
    } catch (err) {
      this.toast.error(
        'Download failed',
        err instanceof UiPathError ? err.message : 'Unknown error',
      )
    } finally {
      this.downloadingField.set(null)
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

  isEmpty(value: unknown): boolean {
    return value === null || value === undefined || value === ''
  }

  isObject(value: unknown): boolean {
    return typeof value === 'object' && value !== null
  }

  pretty(value: unknown): string {
    return JSON.stringify(value, null, 2)
  }
}

/** Crude file-extension guess from a Blob's MIME type. */
function blobExtension(blob: Blob): string {
  const type = blob.type
  if (!type) return ''
  if (type.includes('pdf')) return '.pdf'
  if (type.includes('png')) return '.png'
  if (type.includes('jpeg') || type.includes('jpg')) return '.jpg'
  if (type.includes('csv')) return '.csv'
  if (type.includes('json')) return '.json'
  if (type.includes('xml')) return '.xml'
  if (type.includes('text/plain')) return '.txt'
  return ''
}

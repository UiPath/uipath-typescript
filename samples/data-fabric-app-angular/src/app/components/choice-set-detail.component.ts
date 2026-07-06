import { Component, effect, inject, input, signal, untracked } from '@angular/core'
import { ChoiceSets } from '@uipath/uipath-typescript/entities'
import type { ChoiceSetGetAllResponse } from '@uipath/uipath-typescript/entities'
import { AuthService } from '../core/auth.service'
import { ChoiceSetViewComponent } from './choice-set-view.component'
import { IconListChecks } from './icons'

/**
 * Right-pane detail view for one ChoiceSet.
 *
 * ChoiceSets aren't entities — they have a separate SDK service, so we
 * can't reuse `EntityDetailComponent` here (`Entities.getById()` returns a
 * sparse object on choice-set IDs, with no `fields` array).
 *
 * Composition:
 *  - Header: pulls metadata (display name, description, updatedTime) from
 *    `ChoiceSets.getAll()`.
 *  - Body: `<app-choice-set-view>` renders the list of values via
 *    `ChoiceSets.getById()`.
 */
@Component({
  selector: 'app-choice-set-detail',
  imports: [ChoiceSetViewComponent, IconListChecks],
  styles: `
    :host { flex: 1; min-width: 0; overflow-y: auto; display: block; }
    .detail { padding: 24px; }
    .detail-header { margin-bottom: 24px; min-width: 0; }
    .title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .title-icon { color: var(--muted-foreground); font-size: 18px; }
    .title { font-size: 19px; font-weight: 600; }
    .description { font-size: 13.5px; color: var(--muted-foreground); margin-top: 4px; }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 16px;
      margin-top: 8px;
      font-size: 12px;
      color: var(--muted-foreground);
    }
  `,
  template: `
    <div class="detail">
      <div class="detail-header">
        <div class="title-row">
          <span class="title-icon"><icon-list-checks /></span>
          @if (loading() && !metadata()) {
            <span class="skeleton" style="height: 26px; width: 190px"></span>
          } @else {
            <h2
              class="title truncate"
              [title]="metadata()?.displayName || metadata()?.name || 'Choice set'"
            >
              {{ metadata()?.displayName || metadata()?.name || 'Choice set' }}
            </h2>
          }
          <span class="badge badge-secondary">Choice set</span>
        </div>
        @if (metadata()?.description) {
          <p class="description">{{ metadata()!.description }}</p>
        }
        @if (metadata(); as meta) {
          <div class="meta">
            @if (meta.name) {
              <span>
                System name:
                <code style="font-size: 11.5px; color: var(--foreground)">{{
                  meta.name
                }}</code>
              </span>
            }
            @if (meta.updatedTime) {
              <span>Last updated {{ formatDate(meta.updatedTime) }}</span>
            }
          </div>
        }
      </div>

      <app-choice-set-view [choiceSetId]="choiceSetId()" />
    </div>
  `,
})
export class ChoiceSetDetailComponent {
  private readonly auth = inject(AuthService)

  readonly choiceSetId = input.required<string>()

  readonly metadata = signal<ChoiceSetGetAllResponse | null>(null)
  readonly loading = signal(true)

  constructor() {
    effect(() => {
      const id = this.choiceSetId()
      untracked(() => void this.loadMetadata(id))
    })
  }

  /**
   * `ChoiceSets.getById()` returns the values, not the choice set's own
   * metadata — so the header re-fetches `getAll()` and picks this one out.
   * (Already fetched at the sidebar level, but a small refetch here keeps
   * the components decoupled and is cheap.)
   */
  private async loadMetadata(id: string): Promise<void> {
    this.loading.set(true)
    this.metadata.set(null)
    try {
      const choiceSetService = new ChoiceSets(this.auth.sdk)
      const all = await choiceSetService.getAll()
      // Bail if the user switched choice sets while this request was in
      // flight — a late response must not clobber the newer selection.
      if (id !== this.choiceSetId()) return
      this.metadata.set(all.find((cs) => cs.id === id) ?? null)
    } catch (err) {
      // Header metadata is decorative — the values table below surfaces
      // its own errors, so just log here.
      console.error('Failed to load choice set metadata:', err)
    } finally {
      if (id === this.choiceSetId()) this.loading.set(false)
    }
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString()
  }
}

import { Component, effect, inject, input, signal, untracked } from '@angular/core'
import { ChoiceSets } from '@uipath/uipath-typescript/entities'
import type { ChoiceSetGetResponse } from '@uipath/uipath-typescript/entities'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { AuthService } from '../core/auth.service'
import { IconListChecks, IconRefresh } from './icons'

/**
 * Renders the values inside a Data Fabric ChoiceSet.
 *
 * ChoiceSets aren't regular entities — they don't have user-defined records,
 * just a fixed list of values (think: "Status: Open / Pending / Closed").
 * `Entities.getAllRecords()` doesn't work on them; we use the dedicated
 * `ChoiceSets.getById()` instead — note that despite the name, it returns
 * the *list of values* inside the choice set, not the choice set's own
 * metadata.
 *
 * The values are read-only here — to edit choice-set values, use the Data
 * Service UI in Automation Cloud.
 */
@Component({
  selector: 'app-choice-set-view',
  imports: [IconListChecks, IconRefresh],
  styles: `
    .values-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .values-title { font-size: 13.5px; font-weight: 500; color: var(--muted-foreground); }
    .values-count { color: var(--foreground); }
    .values-card { overflow: hidden; }
    .loading-box {
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--muted-foreground);
      font-size: 13.5px;
    }
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
    .error-alert { margin-bottom: 16px; }
    .table-scroll { overflow-x: auto; }
  `,
  template: `
    <div class="values-header">
      <h3 class="values-title">
        Choice values
        @if (values().length > 0) {
          <span class="values-count">· {{ values().length }}</span>
        }
      </h3>
      <button
        type="button"
        class="btn btn-outline btn-sm"
        [disabled]="loading()"
        (click)="reload()"
      >
        <icon-refresh [class.spin]="loading()" />
        Refresh
      </button>
    </div>

    @if (error(); as err) {
      <div class="alert alert-destructive error-alert">
        <div class="alert-title">Couldn't load choice set</div>
        <div class="alert-description">{{ err }}</div>
      </div>
    }

    <div class="card values-card">
      @if (loading()) {
        <div class="loading-box">
          <icon-refresh class="spin" />
          Loading values…
        </div>
      } @else if (values().length === 0 && !error()) {
        <div class="empty-state">
          <div class="empty-icon"><icon-list-checks /></div>
          <span class="text-muted" style="font-size: 13.5px">
            This choice set has no values yet.
          </span>
        </div>
      } @else {
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 48px">#</th>
                <th>Display name</th>
                <th>Name</th>
                <th>Number ID</th>
              </tr>
            </thead>
            <tbody>
              @for (value of values(); track value.id; let i = $index) {
                <tr>
                  <td class="text-muted">{{ i + 1 }}</td>
                  <td>{{ value.displayName }}</td>
                  <td class="mono text-muted" style="font-size: 12px">
                    {{ value.name }}
                  </td>
                  <td>{{ value.numberId }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class ChoiceSetViewComponent {
  private readonly auth = inject(AuthService)

  readonly choiceSetId = input.required<string>()

  readonly values = signal<ChoiceSetGetResponse[]>([])
  readonly loading = signal(true)
  readonly error = signal<string | null>(null)

  constructor() {
    effect(() => {
      this.choiceSetId()
      untracked(() => void this.reload())
    })
  }

  async reload(): Promise<void> {
    this.loading.set(true)
    this.error.set(null)
    try {
      const choiceSetService = new ChoiceSets(this.auth.sdk)
      // Each `getById` call returns ONE server-capped page — passing no
      // options does NOT return every value. Loop the cursor and accumulate
      // so the full set of choice values loads and the count shown in the
      // UI is accurate.
      const allValues: ChoiceSetGetResponse[] = []
      let page = await choiceSetService.getById(this.choiceSetId(), {
        pageSize: 100,
      })
      allValues.push(...page.items)
      while (page.hasNextPage && page.nextCursor) {
        page = await choiceSetService.getById(this.choiceSetId(), {
          cursor: page.nextCursor,
        })
        allValues.push(...page.items)
      }
      this.values.set(allValues)
    } catch (err) {
      this.error.set(
        err instanceof UiPathError ? err.message : 'Failed to load choice set',
      )
    } finally {
      this.loading.set(false)
    }
  }
}

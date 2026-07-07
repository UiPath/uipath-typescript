import { Component, computed, inject, input, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ChoiceSets, Entities } from '@uipath/uipath-typescript/entities'
import type {
  ChoiceSetGetAllResponse,
  EntityGetResponse,
} from '@uipath/uipath-typescript/entities'
import { UiPathError } from '@uipath/uipath-typescript/core'
import { AuthService } from '../core/auth.service'
import { entityTypeTooltip, isVirtualDataObject } from '../lib/entity-types'
import {
  IconChevronDown,
  IconChevronRight,
  IconDatabase,
  IconListChecks,
  IconRefresh,
  IconSearch,
  IconX,
} from './icons'

/**
 * Left sidebar listing every entity and choice set in the tenant.
 *
 * Data:
 *  - `Entities.getAll()` for the entity catalog (choice-set entries are
 *    filtered out — they live in their own list).
 *  - `ChoiceSets.getAll()` for the choice set list, which carries
 *    choice-set-specific metadata (description, updatedTime) the entity
 *    endpoint doesn't include.
 *
 * Sections are individually collapsible (chevron toggles) so users with
 * many entities can hide them to see choice sets, and vice versa.
 *
 * Includes a search filter (case-insensitive, matches display name + system
 * name across both sections) and a unified refresh button.
 */
@Component({
  selector: 'app-entities-list',
  imports: [
    FormsModule,
    IconChevronDown,
    IconChevronRight,
    IconDatabase,
    IconListChecks,
    IconRefresh,
    IconSearch,
    IconX,
  ],
  styles: `
    aside {
      width: 288px;
      border-right: 1px solid var(--border);
      background: var(--background);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      min-height: 0;
    }
    .sidebar-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .sidebar-title {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--muted-foreground);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .search-row {
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--input);
      border-radius: 6px;
      background: var(--background);
      padding: 0 10px;
      color: var(--muted-foreground);
    }
    .search-box:focus-within {
      border-color: var(--ring);
      box-shadow: 0 0 0 1px var(--ring);
    }
    .search-box input {
      flex: 1;
      min-width: 0;
      border: none;
      background: transparent;
      color: var(--foreground);
      padding: 6px 0;
      font-size: 13.5px;
      font-family: inherit;
    }
    .search-box input:focus { outline: none; }
    .search-clear {
      border: none;
      background: none;
      color: var(--muted-foreground);
      cursor: pointer;
      padding: 0;
      display: inline-flex;
    }
    .search-clear:hover { color: var(--foreground); }
    .sidebar-list { flex: 1; overflow-y: auto; }
    .section-header {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 12px 16px 6px;
      border: none;
      background: none;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--muted-foreground);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      cursor: pointer;
    }
    .section-header:hover:not(:disabled) { color: var(--foreground); }
    .section-header:disabled { cursor: default; }
    .section-count { color: color-mix(in srgb, var(--muted-foreground) 70%, transparent); }
    ul { list-style: none; margin: 0; padding: 0; }
    .row-btn {
      width: 100%;
      text-align: left;
      padding: 8px 16px;
      font-size: 13.5px;
      border: none;
      border-left: 2px solid transparent;
      background: none;
      color: var(--foreground);
      cursor: pointer;
      font-family: inherit;
    }
    .row-btn:hover { background: color-mix(in srgb, var(--accent) 50%, transparent); }
    .row-btn.selected {
      border-left-color: var(--primary);
      background: var(--accent);
      font-weight: 500;
    }
    .row-main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .row-sub {
      font-size: 11.5px;
      color: var(--muted-foreground);
      margin-top: 2px;
    }
    .skeleton-block { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
    .alert-wrap { padding: 12px; }
    .empty-state { padding: 24px; text-align: center; }
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
    .empty-title { font-size: 13.5px; font-weight: 500; }
    .empty-description { font-size: 11.5px; color: var(--muted-foreground); margin-top: 2px; }
    .no-match { padding: 12px 16px; font-size: 12px; color: var(--muted-foreground); }
  `,
  template: `
    <aside>
      <div class="sidebar-header">
        <h2 class="sidebar-title">Catalog</h2>
        <button
          type="button"
          class="btn btn-ghost btn-icon"
          title="Refresh"
          [disabled]="loading() || choiceSetsLoading()"
          (click)="refreshAll()"
        >
          <icon-refresh [class.spin]="loading() || choiceSetsLoading()" />
        </button>
      </div>

      <!-- Search input. Hidden during the initial load to keep the skeleton clean. -->
      @if (!loading() && !error() && entities().length > 0) {
        <div class="search-row">
          <div class="search-box">
            <icon-search />
            <input
              type="text"
              placeholder="Search entities & choice sets…"
              [(ngModel)]="search"
            />
            @if (search()) {
              <button
                type="button"
                class="search-clear"
                aria-label="Clear search"
                (click)="search.set('')"
              >
                <icon-x />
              </button>
            }
          </div>
        </div>
      }

      <div class="sidebar-list">
        <!-- ─── Entities section ─── -->
        <button
          type="button"
          class="section-header"
          [disabled]="searching()"
          [attr.aria-expanded]="showEntities()"
          (click)="entitiesOpen.set(!entitiesOpen())"
        >
          @if (!searching()) {
            @if (showEntities()) {
              <icon-chevron-down />
            } @else {
              <icon-chevron-right />
            }
          }
          <icon-database />
          <span>Entities</span>
          @if (!loading() && !error()) {
            <span class="section-count">· {{ entities().length }}</span>
          }
        </button>

        @if (showEntities()) {
          @if (loading()) {
            <div class="skeleton-block">
              @for (i of [1, 2, 3, 4]; track i) {
                <div>
                  <span class="skeleton" style="height: 16px; width: 66%"></span>
                  <span class="skeleton" style="height: 12px; width: 33%; margin-top: 6px"></span>
                </div>
              }
            </div>
          } @else if (error(); as err) {
            <div class="alert-wrap">
              <div class="alert alert-destructive">
                <div class="alert-title">Couldn't load entities</div>
                <div class="alert-description">{{ err }}</div>
              </div>
            </div>
          } @else if (entities().length === 0) {
            <div class="empty-state">
              <div class="empty-icon"><icon-database /></div>
              <div class="empty-title">No entities yet</div>
              <div class="empty-description">
                Define an entity in Data Service to get started.
              </div>
            </div>
          } @else if (filteredEntities().length === 0) {
            <div class="no-match">No entities match "{{ search() }}".</div>
          } @else {
            <ul>
              @for (entity of filteredEntities(); track entity.id) {
                <li>
                  <button
                    type="button"
                    class="row-btn"
                    [class.selected]="selectedEntityId() === entity.id"
                    [title]="entity.displayName || entity.name"
                    (click)="selectEntity.emit(entity.id)"
                  >
                    <div class="row-main">
                      <span class="truncate">
                        {{ entity.displayName || entity.name }}
                      </span>
                      @if (entityBadge(entity); as badge) {
                        <span
                          class="badge badge-secondary"
                          [title]="entityTooltip(entity)"
                        >
                          {{ badge }}
                        </span>
                      }
                    </div>
                    @if (entity.recordCount !== undefined && !isVdo(entity)) {
                      <div class="row-sub">
                        {{ entity.recordCount }}
                        record{{ entity.recordCount === 1 ? '' : 's' }}
                      </div>
                    }
                  </button>
                </li>
              }
            </ul>
          }
        }

        <!-- ─── Choice Sets section ─── -->
        <button
          type="button"
          class="section-header"
          [disabled]="searching()"
          [attr.aria-expanded]="showChoiceSets()"
          (click)="choiceSetsOpen.set(!choiceSetsOpen())"
        >
          @if (!searching()) {
            @if (showChoiceSets()) {
              <icon-chevron-down />
            } @else {
              <icon-chevron-right />
            }
          }
          <icon-list-checks />
          <span>Choice sets</span>
          @if (!choiceSetsLoading() && !choiceSetsError()) {
            <span class="section-count">· {{ choiceSets().length }}</span>
          }
        </button>

        @if (showChoiceSets()) {
          @if (choiceSetsLoading()) {
            <div class="skeleton-block">
              @for (i of [1, 2]; track i) {
                <span class="skeleton" style="height: 16px; width: 66%"></span>
              }
            </div>
          } @else if (choiceSetsError(); as err) {
            <div class="alert-wrap">
              <div class="alert alert-destructive">
                <div class="alert-title">Couldn't load choice sets</div>
                <div class="alert-description">{{ err }}</div>
              </div>
            </div>
          } @else if (choiceSets().length === 0) {
            <div class="empty-state">
              <div class="empty-icon"><icon-list-checks /></div>
              <div class="empty-title">No choice sets</div>
              <div class="empty-description">
                No choice sets defined in this tenant.
              </div>
            </div>
          } @else if (filteredChoiceSets().length === 0) {
            <div class="no-match">No choice sets match "{{ search() }}".</div>
          } @else {
            <ul>
              @for (cs of filteredChoiceSets(); track cs.id) {
                <li>
                  <button
                    type="button"
                    class="row-btn"
                    [class.selected]="selectedChoiceSetId() === cs.id"
                    [title]="cs.description || cs.displayName"
                    (click)="selectChoiceSet.emit(cs.id)"
                  >
                    <div class="row-main">
                      <span class="truncate">{{ cs.displayName || cs.name }}</span>
                    </div>
                    @if (cs.description) {
                      <div class="row-sub truncate">{{ cs.description }}</div>
                    }
                  </button>
                </li>
              }
            </ul>
          }
        }
      </div>
    </aside>
  `,
})
export class EntitiesListComponent {
  private readonly auth = inject(AuthService)

  readonly selectedEntityId = input<string | null>(null)
  readonly selectedChoiceSetId = input<string | null>(null)
  readonly selectEntity = output<string>()
  readonly selectChoiceSet = output<string>()

  readonly entities = signal<EntityGetResponse[]>([])
  readonly loading = signal(true)
  readonly error = signal<string | null>(null)

  readonly choiceSets = signal<ChoiceSetGetAllResponse[]>([])
  readonly choiceSetsLoading = signal(true)
  readonly choiceSetsError = signal<string | null>(null)

  readonly search = signal('')
  readonly searching = computed(() => this.search().trim().length > 0)

  // Collapsed-state flags for each section. Defaults to open. A user with
  // 50+ entities can collapse that section to see choice sets without
  // scrolling. When the user searches, sections auto-expand temporarily so
  // search results aren't hidden behind a collapsed header.
  readonly entitiesOpen = signal(true)
  readonly choiceSetsOpen = signal(true)
  readonly showEntities = computed(() => this.entitiesOpen() || this.searching())
  readonly showChoiceSets = computed(
    () => this.choiceSetsOpen() || this.searching(),
  )

  readonly filteredEntities = computed(() => {
    const needle = this.search().trim().toLowerCase()
    if (!needle) return this.entities()
    return this.entities().filter(
      (e) =>
        e.displayName.toLowerCase().includes(needle) ||
        e.name.toLowerCase().includes(needle),
    )
  })

  readonly filteredChoiceSets = computed(() => {
    const needle = this.search().trim().toLowerCase()
    if (!needle) return this.choiceSets()
    return this.choiceSets().filter(
      (cs) =>
        cs.displayName.toLowerCase().includes(needle) ||
        cs.name.toLowerCase().includes(needle),
    )
  })

  constructor() {
    void this.refreshAll()
  }

  async refreshAll(): Promise<void> {
    await Promise.all([this.loadEntities(), this.loadChoiceSets()])
  }

  private async loadEntities(): Promise<void> {
    this.loading.set(true)
    this.error.set(null)
    try {
      // Construct a service instance per call. The SDK keeps these cheap;
      // there's no shared client to manage. The instance is bound to the
      // authenticated `sdk` from AuthService.
      const entityService = new Entities(this.auth.sdk)
      // `Entities.getAll()` returns `EntityGetResponse[]` directly (no
      // pagination wrapper). Filter out ChoiceSet items here so they don't
      // show up in both the entities and choice-sets sidebar sections —
      // the choice-sets section is sourced from `ChoiceSets.getAll()` and
      // carries choice-set-specific metadata.
      const allEntities = await entityService.getAll()
      this.entities.set(allEntities.filter((e) => e.entityType !== 'ChoiceSet'))
    } catch (err) {
      this.error.set(
        err instanceof UiPathError ? err.message : 'Failed to load entities',
      )
    } finally {
      this.loading.set(false)
    }
  }

  private async loadChoiceSets(): Promise<void> {
    this.choiceSetsLoading.set(true)
    this.choiceSetsError.set(null)
    try {
      const choiceSetService = new ChoiceSets(this.auth.sdk)
      // `ChoiceSets.getAll()` returns `ChoiceSetGetAllResponse[]` directly.
      this.choiceSets.set(await choiceSetService.getAll())
    } catch (err) {
      this.choiceSetsError.set(
        err instanceof UiPathError ? err.message : 'Failed to load choice sets',
      )
    } finally {
      this.choiceSetsLoading.set(false)
    }
  }

  isVdo(entity: EntityGetResponse): boolean {
    return isVirtualDataObject(entity)
  }

  /** Badge label for non-standard entities (VDO / SystemEntity / …). */
  entityBadge(entity: EntityGetResponse): string | null {
    if (isVirtualDataObject(entity)) return 'VDO'
    if (entity.entityType && entity.entityType !== 'Entity') {
      return entity.entityType
    }
    return null
  }

  entityTooltip(entity: EntityGetResponse): string {
    return isVirtualDataObject(entity)
      ? 'Virtual Data Object — sourced from external systems via joins'
      : entityTypeTooltip(entity.entityType)
  }
}

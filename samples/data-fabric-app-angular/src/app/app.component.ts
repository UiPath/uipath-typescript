import { Component, inject, signal } from '@angular/core'
import type { OnInit } from '@angular/core'
import { AuthService } from './core/auth.service'
import { ThemeService } from './core/theme.service'
import { LoginScreenComponent } from './components/login-screen.component'
import { HeaderComponent } from './components/header.component'
import { EntitiesListComponent } from './components/entities-list.component'
import { EntityDetailComponent } from './components/entity-detail.component'
import { ChoiceSetDetailComponent } from './components/choice-set-detail.component'
import { ToastContainerComponent } from './components/toast-container.component'
import { IconDatabase } from './components/icons'

@Component({
  selector: 'app-root',
  imports: [
    LoginScreenComponent,
    HeaderComponent,
    EntitiesListComponent,
    EntityDetailComponent,
    ChoiceSetDetailComponent,
    ToastContainerComponent,
    IconDatabase,
  ],
  styles: `
    .init-screen {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--background);
      color: var(--muted-foreground);
      font-size: 13.5px;
    }
    .app-shell {
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--background);
    }
    .app-body { display: flex; flex: 1; min-height: 0; }
    main { flex: 1; min-width: 0; overflow: hidden; display: flex; }
    .empty-detail {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
    }
    .empty-detail-inner { text-align: center; max-width: 340px; }
    .empty-detail-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius);
      background: var(--muted);
      color: var(--muted-foreground);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
      font-size: 22px;
    }
    .empty-detail-title { font-size: 13.5px; font-weight: 500; }
    .empty-detail-text {
      font-size: 13.5px;
      color: var(--muted-foreground);
      margin-top: 4px;
    }
  `,
  template: `
    @if (auth.isLoading() && !auth.isAuthenticated()) {
      <div class="init-screen">Initializing UiPath SDK…</div>
    } @else if (!auth.isAuthenticated()) {
      <app-login-screen />
    } @else {
      <div class="app-shell">
        <app-header />
        <div class="app-body">
          <app-entities-list
            [selectedEntityId]="selectedEntityId()"
            [selectedChoiceSetId]="selectedChoiceSetId()"
            (selectEntity)="selectEntity($event)"
            (selectChoiceSet)="selectChoiceSet($event)"
          />
          <main>
            @if (selectedEntityId(); as entityId) {
              <app-entity-detail [entityId]="entityId" />
            } @else if (selectedChoiceSetId(); as choiceSetId) {
              <app-choice-set-detail [choiceSetId]="choiceSetId" />
            } @else {
              <div class="empty-detail">
                <div class="empty-detail-inner">
                  <div class="empty-detail-icon"><icon-database /></div>
                  <h3 class="empty-detail-title">No entity selected</h3>
                  <p class="empty-detail-text">
                    Pick an entity from the sidebar to view its schema and
                    records.
                  </p>
                </div>
              </div>
            }
          </main>
        </div>
      </div>
    }
    <app-toast-container />
  `,
})
export class AppComponent implements OnInit {
  readonly auth = inject(AuthService)
  // Instantiated for its side effect: applies the persisted theme class to
  // <html> on startup.
  private readonly theme = inject(ThemeService)

  // Mutually exclusive selection — clicking an entity clears the choice
  // set selection and vice versa. Routes the right-pane content to the
  // appropriate detail component (EntityDetail vs ChoiceSetDetail), since
  // choice sets aren't entities (different SDK service, different schema
  // shape) and can't go through EntityDetail's entity-shaped pipeline.
  readonly selectedEntityId = signal<string | null>(null)
  readonly selectedChoiceSetId = signal<string | null>(null)

  ngOnInit(): void {
    void this.auth.init()
  }

  selectEntity(id: string): void {
    this.selectedEntityId.set(id)
    this.selectedChoiceSetId.set(null)
  }

  selectChoiceSet(id: string): void {
    this.selectedChoiceSetId.set(id)
    this.selectedEntityId.set(null)
  }
}

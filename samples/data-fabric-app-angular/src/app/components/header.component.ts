import { Component, inject } from '@angular/core'
import { AuthService } from '../core/auth.service'
import { ThemeService } from '../core/theme.service'
import { IconDatabase, IconLogOut, IconMoon, IconSun } from './icons'

@Component({
  selector: 'app-header',
  imports: [IconDatabase, IconLogOut, IconMoon, IconSun],
  styles: `
    header {
      border-bottom: 1px solid var(--border);
      background: var(--background);
      flex-shrink: 0;
    }
    .header-inner {
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-brand { display: flex; align-items: center; gap: 8px; }
    .header-logo {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: color-mix(in srgb, var(--primary) 10%, transparent);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
    }
    .header-title { font-size: 15px; font-weight: 600; }
    .header-actions { display: flex; align-items: center; gap: 4px; }
  `,
  template: `
    <header>
      <div class="header-inner">
        <div class="header-brand">
          <div class="header-logo"><icon-database /></div>
          <h1 class="header-title">Data Fabric Explorer</h1>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            [title]="theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
            (click)="theme.toggle()"
          >
            @if (theme.theme() === 'dark') {
              <icon-sun />
            } @else {
              <icon-moon />
            }
          </button>
          <button type="button" class="btn btn-ghost btn-sm" (click)="auth.logout()">
            <icon-log-out />
            Sign out
          </button>
        </div>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  readonly auth = inject(AuthService)
  readonly theme = inject(ThemeService)
}

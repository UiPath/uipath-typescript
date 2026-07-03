import { Component, inject } from '@angular/core'
import { AuthService } from '../core/auth.service'
import { IconDatabase } from './icons'

@Component({
  selector: 'app-login-screen',
  imports: [IconDatabase],
  styles: `
    .login-wrap {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--muted) 30%, var(--background));
      padding: 16px;
    }
    .login-card {
      max-width: 420px;
      width: 100%;
      padding: 24px;
    }
    .login-logo {
      width: 40px;
      height: 40px;
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--primary) 10%, transparent);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      margin-bottom: 12px;
    }
    .login-title { font-size: 17px; font-weight: 600; }
    .login-description {
      font-size: 13.5px;
      color: var(--muted-foreground);
      margin-top: 4px;
      margin-bottom: 18px;
    }
    .login-error { margin-bottom: 14px; }
    .login-btn { width: 100%; }
  `,
  template: `
    <div class="login-wrap">
      <div class="card login-card">
        <div class="login-logo"><icon-database /></div>
        <h1 class="login-title">Data Fabric Explorer</h1>
        <p class="login-description">
          Browse and edit your UiPath Data Fabric entities and records.
        </p>
        @if (auth.error(); as error) {
          <div class="alert alert-destructive login-error">
            <div class="alert-title">Login failed</div>
            <div class="alert-description">{{ error }}</div>
          </div>
        }
        <button
          type="button"
          class="btn btn-primary login-btn"
          [disabled]="auth.isLoading()"
          (click)="auth.login()"
        >
          {{ auth.isLoading() ? 'Signing in…' : 'Sign in with UiPath' }}
        </button>
      </div>
    </div>
  `,
})
export class LoginScreenComponent {
  readonly auth = inject(AuthService)
}

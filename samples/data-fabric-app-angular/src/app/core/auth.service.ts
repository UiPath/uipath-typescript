import { Injectable, signal } from '@angular/core'
import { UiPath, UiPathError } from '@uipath/uipath-typescript/core'

/**
 * Provides the authenticated UiPath SDK instance to the app — the Angular
 * counterpart of the React sample's `AuthContext`.
 *
 * Coded App pattern: `new UiPath()` (no config) picks up `clientId`,
 * `orgName`, `tenantName`, `baseUrl`, `scope`, and `redirectUri` from the
 * `<meta name="uipath:*">` tags injected by `tools/uipath-meta-tags.mjs`
 * (locally, from `uipath.json`) or by the UiPath platform (in production).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly sdk = new UiPath()

  readonly isAuthenticated = signal(false)
  readonly isLoading = signal(true)
  readonly error = signal<string | null>(null)

  /**
   * Completes the OAuth code exchange when the app loads on the redirect
   * URI, otherwise just reads the current auth state. Called once from
   * `AppComponent` on startup.
   */
  async init(): Promise<void> {
    this.isLoading.set(true)
    this.error.set(null)
    try {
      if (this.sdk.isInOAuthCallback()) {
        // SDK strips ?code & ?state from the URL after a successful exchange.
        await this.sdk.completeOAuth()
      }
      this.isAuthenticated.set(this.sdk.isAuthenticated())
    } catch (err) {
      console.error('Auth init failed:', err)
      this.error.set(
        err instanceof UiPathError ? err.message : 'Authentication failed',
      )
      this.isAuthenticated.set(false)
    } finally {
      this.isLoading.set(false)
    }
  }

  /** Starts the OAuth flow (redirects to UiPath Cloud). */
  async login(): Promise<void> {
    this.isLoading.set(true)
    this.error.set(null)
    try {
      this.sdk.setMultiLogin()
      await this.sdk.initialize()
      this.isAuthenticated.set(this.sdk.isAuthenticated())
    } catch (err) {
      console.error('Login failed:', err)
      this.error.set(err instanceof UiPathError ? err.message : 'Login failed')
      this.isAuthenticated.set(false)
    } finally {
      this.isLoading.set(false)
    }
  }

  logout(): void {
    this.sdk.logout()
    this.isAuthenticated.set(false)
    this.error.set(null)
  }
}

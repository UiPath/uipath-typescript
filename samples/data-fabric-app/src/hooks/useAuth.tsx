import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { UiPath, UiPathError } from '@uipath/uipath-typescript/core'
import type { UiPathSDKConfig } from '@uipath/uipath-typescript/core'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  sdk: UiPath
  login: () => Promise<void>
  logout: () => void
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Provides the authenticated UiPath SDK instance to the app.
 *
 * Pattern follows the UiPath Coded Apps web-app template:
 *  1. `<AuthProvider config={...}>` constructs a `UiPath` instance from the
 *     config you pass in. In Coded App deployments you can pass an empty
 *     object; the SDK fills required fields from the `<meta name="uipath:*">`
 *     tags injected by the platform (or by `@uipath/coded-apps-dev`
 *     locally via `uipath.json`).
 *  2. On mount, the provider checks whether the browser is returning from an
 *     OAuth callback; if so, it completes the PKCE exchange and strips the
 *     `code` + `state` query params so a refresh doesn't try to re-consume
 *     the (now-invalidated) code.
 *  3. `login()` kicks off the OAuth redirect via `sdk.initialize()`.
 *  4. `logout()` clears local tokens — the user must call `login()` again to
 *     re-authenticate.
 */
export function AuthProvider({
  children,
  config,
}: {
  children: ReactNode
  config: UiPathSDKConfig
}) {
  const [sdk] = useState<UiPath>(() => new UiPath(config))
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // React StrictMode invokes effects twice in dev, which would try to
  // consume the OAuth `code` parameter twice — the second call fails with
  // "Authentication failed" because the code is single-use. This ref
  // guards against that double-invocation.
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    const init = async () => {
      setIsLoading(true)
      setError(null)
      try {
        if (sdk.isInOAuthCallback()) {
          await sdk.completeOAuth()
          // Remove `?code=…&state=…` from the URL so a page refresh doesn't
          // try to re-consume the already-spent code.
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          )
        }
        setIsAuthenticated(sdk.isAuthenticated())
      } catch (err) {
        console.error('Auth init failed:', err)
        setError(
          err instanceof UiPathError ? err.message : 'Authentication failed',
        )
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [sdk])

  const login = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await sdk.initialize()
      setIsAuthenticated(sdk.isAuthenticated())
    } catch (err) {
      console.error('Login failed:', err)
      setError(err instanceof UiPathError ? err.message : 'Login failed')
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    sdk.logout()
    setIsAuthenticated(false)
    setError(null)
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, sdk, login, logout, error }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

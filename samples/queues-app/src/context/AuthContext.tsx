import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { UiPath, UiPathError } from '@uipath/uipath-typescript/core'

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
 * Coded App pattern: `new UiPath()` (no config) picks up `clientId`,
 * `orgName`, `tenantName`, `baseUrl`, `scope`, and `redirectUri` from the
 * `<meta name="uipath:*">` tags injected by `@uipath/coded-apps-dev`
 * (locally, from `uipath.json`) or by the UiPath platform (in production).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [sdk] = useState<UiPath>(() => new UiPath())
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Guard against React StrictMode's double-invocation in dev — the OAuth
  // `code` is single-use, so calling completeOAuth() twice fails the second
  // time with "Authentication failed".
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    const init = async () => {
      setIsLoading(true)
      setError(null)
      try {
        if (sdk.isInOAuthCallback()) {
          // SDK strips ?code & ?state from the URL after a successful exchange.
          await sdk.completeOAuth()
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

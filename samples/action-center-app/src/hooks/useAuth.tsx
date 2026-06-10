import { useState, useEffect, useRef, createContext, useContext } from 'react'
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
 * Provides the authenticated UiPath SDK instance. Follows the Coded Apps
 * web-app template: the SDK config is filled from the `<meta name="uipath:*">`
 * tags injected by the platform (or by `@uipath/coded-apps-dev` locally from
 * uipath.json), so callers can pass an empty config object.
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

  // React Strict Mode double-invokes effects in dev; OAuth codes are
  // single-use, so guard against completing the exchange twice.
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
          window.history.replaceState({}, document.title, window.location.pathname)
        }
        setIsAuthenticated(sdk.isAuthenticated())
      } catch (err) {
        setError(err instanceof UiPathError ? err.message : 'Authentication failed')
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
      setError(err instanceof UiPathError ? err.message : 'Login failed')
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
    <AuthContext.Provider value={{ isAuthenticated, isLoading, sdk, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

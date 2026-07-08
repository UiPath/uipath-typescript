import React, { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react'
import type { ReactNode } from 'react'
import { UiPath } from '@uipath/uipath-typescript/core'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  sdk: UiPath
  getToken: () => Promise<string>
  login: () => Promise<void>
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Config comes from `<meta name="uipath:*">` tags — there is no `VITE_*` / `.env`
 * setup. In local dev the `uipathCodedApps()` Vite plugin injects them from
 * `uipath.json`; in production the UiPath Apps host injects them. Either way
 * `new UiPath()` (no args) reads org/tenant/base-url/client-id/scope from the tags.
 *
 * Two token flows, distinguished by how the app is loaded:
 * - Host-embedded (`?host=embed` in a UiPath host iframe): the SDK delegates token
 *   refresh to the host via postMessage; it self-initializes, so just render.
 * - Local / standalone: OAuth-PKCE using the injected client-id + redirect-uri.
 */
function isHostEmbedded(): boolean {
  return typeof window !== 'undefined'
    && window.self !== window.top
    && new URLSearchParams(window.location.search).get('host') === 'embed'
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [embedded] = useState(isHostEmbedded)
  // No constructor args: config is read from the injected uipath:* meta tags.
  const [{ sdk }] = useState(() => ({ sdk: new UiPath() }))
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    const init = async () => {
      setIsLoading(true)
      setError(null)
      try {
        if (embedded) {
          // Host delegates tokens on demand (first API call triggers the
          // postMessage refresh); the SDK self-initialized in its constructor.
          setIsAuthenticated(true)
        } else {
          // Local / standalone: OAuth-PKCE using the meta-tag config.
          if (sdk.isInOAuthCallback()) {
            await sdk.completeOAuth()
            window.history.replaceState({}, document.title, window.location.pathname)
          } else if (!sdk.isAuthenticated()) {
            await sdk.initialize()
          }
          setIsAuthenticated(sdk.isAuthenticated())
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed')
      } finally {
        setIsLoading(false)
      }
    }

    void init()
    // No logout-on-cleanup: under React 18 StrictMode the dev-only
    // mount→cleanup→mount cycle would wipe the session right after
    // completeOAuth() succeeds and re-trigger the OAuth redirect (infinite
    // loop). The didInit ref alone guards double-init — refs persist across
    // StrictMode's simulated remount. Session teardown belongs on explicit
    // sign-out, not on every unmount.
  }, [sdk, embedded])

  const getToken = useCallback(async (): Promise<string> => {
    const token = sdk.getToken()
    if (token) return token
    throw new Error('Access token not available — please sign in')
  }, [sdk])

  const login = useCallback(async () => {
    await sdk.initialize()
  }, [sdk])

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    sdk,
    getToken,
    login,
    error,
  }

  return React.createElement(AuthContext.Provider, { value }, children)
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

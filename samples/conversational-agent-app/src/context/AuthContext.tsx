/**
 * AuthContext - Manages SDK authentication (same pattern as process-app)
 */

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import { UiPath } from '@uipath/uipath-typescript/core'
import type { UiPathSDKConfig } from '@uipath/uipath-typescript/core'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  uipathSDK: UiPath
  login: () => Promise<void>
  logout: () => void
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children, config }: { children: ReactNode; config: UiPathSDKConfig }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uipathSDK, setUipathSDK] = useState<UiPath>(() => new UiPath(config))

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Handle OAuth callback if present
        if (uipathSDK.isInOAuthCallback()) {
          await uipathSDK.completeOAuth()
        }
        // Check authentication status
        setIsAuthenticated(uipathSDK.isAuthenticated())
      } catch (err) {
        console.error('Authentication initialization failed:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [uipathSDK])

  const login = async () => {
    setIsLoading(true)
    setError(null)

    try {
      await uipathSDK.initialize()
      setIsAuthenticated(uipathSDK.isAuthenticated())
    } catch (err) {
      console.error('Login failed:', err)
      setError(err instanceof Error ? err.message : 'Login failed')
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setError(null)
    // Create new SDK instance for next login
    setUipathSDK(new UiPath(config))
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, uipathSDK, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { UiPath, UiPathError } from '@uipath/uipath-typescript/core';

interface AuthContextValue {
  sdk: UiPath;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Provides the authenticated UiPath SDK instance to the app.
 *
 * Coded App pattern: `new UiPath()` (no config) picks up `clientId`,
 * `orgName`, `tenantName`, `baseUrl`, `scope`, and `redirectUri` from the
 * `<meta name="uipath:*">` tags injected by `@uipath/coded-apps-dev`
 * (locally, from `uipath.json`) or by the UiPath platform (in production).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sdk] = useState<UiPath>(() => new UiPath());

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (sdk.isInOAuthCallback()) {
          await sdk.completeOAuth();
        }
        setIsAuthenticated(sdk.isAuthenticated());
      } catch (err) {
        console.error('Authentication initialization failed:', err);
        setError(err instanceof UiPathError ? err.message : 'Authentication failed');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, [sdk]);

  const login = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await sdk.initialize();
      setIsAuthenticated(sdk.isAuthenticated());
    } catch (err) {
      console.error('Login failed:', err);
      setError(err instanceof UiPathError ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ sdk, isAuthenticated, isLoading, error, login }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { UiPath } from '@uipath/uipath-typescript/core';

interface AuthContextValue {
  sdk: UiPath;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
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
  // The OAuth code is single-use: StrictMode runs effects twice in development,
  // and a second exchange of the same code fails and signs the user out again.
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
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
        setError('Sign-in failed. Try again.');
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
      setError('Sign-in failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /** Clears the stored token and ends the UiPath session, so the next sign-in can use another account. */
  const logout = () => {
    sdk.logout({ endSession: true });
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ sdk, isAuthenticated, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

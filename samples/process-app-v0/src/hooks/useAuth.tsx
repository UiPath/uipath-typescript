import React, { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import {
  UiPath,
  UiPathError
} from '@uipath/uipath-typescript';
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  sdk: UiPath;
  login: () => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Coded App pattern: `new UiPath()` (no config) picks up `clientId`,
// `orgName`, `tenantName`, `baseUrl`, `scope`, and `redirectUri` from the
// `<meta name="uipath:*">` tags injected by `@uipath/coded-apps-dev`
// (locally, from `uipath.json`) or by the UiPath platform (in production).
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sdk] = useState<UiPath>(() => new UiPath());

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Handle OAuth callback if present
        if (sdk.isInOAuthCallback()) {
          await sdk.completeOAuth();
        }
        // Check authentication status
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
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    sdk.logout();
    setIsAuthenticated(false);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        sdk,
        login,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
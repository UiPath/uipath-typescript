import React, { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { UiPath, UiPathError } from '@uipath/uipath-typescript/core';
import type { UiPathSDKConfig } from '@uipath/uipath-typescript/core';

const CONFIG_STORAGE_KEY = 'bdo_bucket_config';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  sdk: UiPath | null;
  configureAndLogin: (config: UiPathSDKConfig) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sdk, setSdk] = useState<UiPath | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const savedConfig = sessionStorage.getItem(CONFIG_STORAGE_KEY);
      if (!savedConfig) {
        setIsLoading(false);
        return;
      }

      try {
        const config: UiPathSDKConfig = JSON.parse(savedConfig);
        const sdkInstance = new UiPath(config);

        if (sdkInstance.isInOAuthCallback()) {
          await sdkInstance.completeOAuth();
        }

        setSdk(sdkInstance);
        setIsAuthenticated(sdkInstance.isAuthenticated());
      } catch (err) {
        console.error('Authentication initialization failed:', err);
        setError(err instanceof UiPathError ? err.message : 'Authentication failed');
        sessionStorage.removeItem(CONFIG_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const configureAndLogin = async (config: UiPathSDKConfig) => {
    setIsLoading(true);
    setError(null);
    try {
      sessionStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      const sdkInstance = new UiPath(config);
      setSdk(sdkInstance);
      await sdkInstance.initialize();
      setIsAuthenticated(sdkInstance.isAuthenticated());
    } catch (err) {
      console.error('Login failed:', err);
      setError(err instanceof UiPathError ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    const savedConfig = sessionStorage.getItem(CONFIG_STORAGE_KEY);
    if (savedConfig) {
      try {
        const config: UiPathSDKConfig = JSON.parse(savedConfig);
        sessionStorage.removeItem(`uipath_sdk_user_token-${config.clientId}`);
      } catch {}
    }
    sessionStorage.removeItem('uipath_sdk_oauth_context');
    sessionStorage.removeItem('uipath_sdk_code_verifier');
    sessionStorage.removeItem(CONFIG_STORAGE_KEY);
    setIsAuthenticated(false);
    setError(null);
    setSdk(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, sdk, configureAndLogin, logout, error }}>
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

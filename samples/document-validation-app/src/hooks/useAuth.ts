import { createContext, useContext } from 'react';
import type { UiPath } from '@uipath/uipath-typescript/core';

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  sdk: UiPath;
  login: () => Promise<void>;
  logout: () => void;
  error: string | null;
}

/** Shared with AuthProvider, which is the only thing that should populate it. */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

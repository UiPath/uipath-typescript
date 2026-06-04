import { useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import type { UiPathSDKConfig } from '@uipath/uipath-typescript/core';
import ValidationInbox from './components/ValidationInbox';

const authConfig: UiPathSDKConfig = {
  clientId: import.meta.env.VITE_UIPATH_CLIENT_ID,
  orgName: import.meta.env.VITE_UIPATH_ORG_NAME,
  tenantName: import.meta.env.VITE_UIPATH_TENANT_NAME,
  baseUrl: import.meta.env.VITE_UIPATH_BASE_URL,
  redirectUri: import.meta.env.VITE_UIPATH_REDIRECT_URI,
  scope: import.meta.env.VITE_UIPATH_SCOPE,
};

function AppContent() {
  const { isAuthenticated, isLoading, error, login, logout } = useAuth();

  useEffect(() => {
    document.body.classList.add('light');
    document.body.classList.remove('dark');
  }, []);

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-sm w-full bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-semibold mb-2">Document Validation</h1>
          <p className="text-gray-600 mb-6">
            Sign in with your UiPath account to review pending validation tasks.
          </p>
          <button
            onClick={login}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign in with UiPath
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="flex justify-between items-center px-6 py-3 border-b bg-white shrink-0">
        <h1 className="text-lg font-semibold">Document Validation</h1>
        <button
          onClick={logout}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Sign out
        </button>
      </header>
      <main className="flex-1 min-h-0">
        <ValidationInbox />
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider config={authConfig}>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

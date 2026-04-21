import { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { AssetList } from './components/AssetList';
import { GetByNameDemo } from './components/GetByNameDemo';
import type { UiPathSDKConfig } from '@uipath/uipath-typescript/core';

const authConfig: UiPathSDKConfig = {
  clientId: import.meta.env.VITE_UIPATH_CLIENT_ID || 'your-client-id',
  orgName: import.meta.env.VITE_UIPATH_ORG_NAME || 'your-organization',
  tenantName: import.meta.env.VITE_UIPATH_TENANT_NAME || 'your-tenant',
  baseUrl: import.meta.env.VITE_UIPATH_BASE_URL || window.location.origin,
  redirectUri: import.meta.env.VITE_UIPATH_REDIRECT_URI || window.location.origin,
  scope: import.meta.env.VITE_UIPATH_SCOPE || 'offline_access',
};

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [folderKey, setFolderKey] = useState('');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600 font-medium">Initializing UiPath SDK…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <AssetList
          onPickAsset={(n, fp, fk) => {
            setName(n);
            setFolderPath(fp);
            setFolderKey(fk);
          }}
        />
        <GetByNameDemo
          name={name}
          folderPath={folderPath}
          folderKey={folderKey}
          onNameChange={setName}
          onFolderPathChange={setFolderPath}
          onFolderKeyChange={setFolderKey}
        />
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

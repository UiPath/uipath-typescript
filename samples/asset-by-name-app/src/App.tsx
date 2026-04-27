import { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { AssetList } from './components/assets/AssetList';
import { AssetsGetByName } from './components/assets/AssetsGetByName';
import { ProcessList } from './components/processes/ProcessList';
import { ProcessesGetByName } from './components/processes/ProcessesGetByName';
import { BucketList } from './components/buckets/BucketList';
import { BucketsGetByName } from './components/buckets/BucketsGetByName';
import type { UiPathSDKConfig } from '@uipath/uipath-typescript/core';

const authConfig: UiPathSDKConfig = {
  clientId: import.meta.env.VITE_UIPATH_CLIENT_ID || 'your-client-id',
  orgName: import.meta.env.VITE_UIPATH_ORG_NAME || 'your-organization',
  tenantName: import.meta.env.VITE_UIPATH_TENANT_NAME || 'your-tenant',
  baseUrl: import.meta.env.VITE_UIPATH_BASE_URL || window.location.origin,
  redirectUri: import.meta.env.VITE_UIPATH_REDIRECT_URI || window.location.origin,
  scope: import.meta.env.VITE_UIPATH_SCOPE || 'offline_access',
};

type ResourceTab = 'assets' | 'processes' | 'buckets';

interface TabState {
  name: string;
  folderPath: string;
  folderKey: string;
}

const emptyState: TabState = { name: '', folderPath: '', folderKey: '' };

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ResourceTab>('assets');
  // Each resource tab keeps its own form state so switching tabs doesn't
  // wipe what the user typed.
  const [assetState, setAssetState] = useState<TabState>(emptyState);
  const [processState, setProcessState] = useState<TabState>(emptyState);
  const [bucketState, setBucketState] = useState<TabState>(emptyState);

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

  const tabs: Array<{ id: ResourceTab; label: string }> = [
    { id: 'assets', label: 'Assets' },
    { id: 'processes', label: 'Processes' },
    { id: 'buckets', label: 'Buckets' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={
                'px-5 py-3 text-sm font-medium border-b-2 transition-colors ' +
                (activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900')
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
      <main className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {activeTab === 'assets' && (
          <>
            <AssetList
              onPickAsset={(name, folderPath, folderKey) =>
                setAssetState({ name, folderPath, folderKey })
              }
            />
            <AssetsGetByName
              name={assetState.name}
              folderPath={assetState.folderPath}
              folderKey={assetState.folderKey}
              onNameChange={(name) => setAssetState((s) => ({ ...s, name }))}
              onFolderPathChange={(folderPath) => setAssetState((s) => ({ ...s, folderPath }))}
              onFolderKeyChange={(folderKey) => setAssetState((s) => ({ ...s, folderKey }))}
            />
          </>
        )}

        {activeTab === 'processes' && (
          <>
            <ProcessList
              onPickProcess={(name, folderPath, folderKey) =>
                setProcessState({ name, folderPath, folderKey })
              }
            />
            <ProcessesGetByName
              name={processState.name}
              folderPath={processState.folderPath}
              folderKey={processState.folderKey}
              onNameChange={(name) => setProcessState((s) => ({ ...s, name }))}
              onFolderPathChange={(folderPath) => setProcessState((s) => ({ ...s, folderPath }))}
              onFolderKeyChange={(folderKey) => setProcessState((s) => ({ ...s, folderKey }))}
            />
          </>
        )}

        {activeTab === 'buckets' && (
          <>
            <BucketList
              onPickBucket={(name, folderPath, folderKey) =>
                setBucketState({ name, folderPath, folderKey })
              }
            />
            <BucketsGetByName
              name={bucketState.name}
              folderPath={bucketState.folderPath}
              folderKey={bucketState.folderKey}
              onNameChange={(name) => setBucketState((s) => ({ ...s, name }))}
              onFolderPathChange={(folderPath) => setBucketState((s) => ({ ...s, folderPath }))}
              onFolderKeyChange={(folderKey) => setBucketState((s) => ({ ...s, folderKey }))}
            />
          </>
        )}
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

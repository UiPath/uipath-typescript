import { useState } from 'react';
import { AuthProvider } from './hooks/useAuth';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { CaseInstanceView } from './components/CaseInstanceView';
import { CaseInstancesHome } from './components/CaseInstancesHome';
import type { UiPathSDKConfig } from '@uipath/uipath-typescript';

const authConfig: UiPathSDKConfig = {
  clientId: import.meta.env.VITE_UIPATH_CLIENT_ID || 'your-client-id',
  orgName: import.meta.env.VITE_UIPATH_ORG_NAME || 'your-organization',
  tenantName: import.meta.env.VITE_UIPATH_TENANT_NAME || 'your-tenant',
  baseUrl: import.meta.env.VITE_UIPATH_BASE_URL || window.location.origin,
  redirectUri: import.meta.env.VITE_UIPATH_REDIRECT_URI || window.location.origin,
  scope: import.meta.env.VITE_UIPATH_SCOPE || 'offline_access CM.Cases.Read CM.Cases.Write OR.Users',
};

interface SelectedInstance {
  instanceId: string;
  folderKey: string;
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedInstance, setSelectedInstance] = useState<SelectedInstance | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600 font-medium">Initializing UiPath SDK...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Show home page when no instance is selected
  if (!selectedInstance) {
    return (
      <CaseInstancesHome
        onSelectInstance={(instanceId, folderKey) => setSelectedInstance({ instanceId, folderKey })}
      />
    );
  }

  // Show case instance view when an instance is selected
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        caseTitle="Case"
        onBack={() => setSelectedInstance(null)}
      />
      <CaseInstanceView
        caseInstanceId={selectedInstance.instanceId}
        folderKey={selectedInstance.folderKey}
      />
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

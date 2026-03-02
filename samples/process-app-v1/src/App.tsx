import { useState } from 'react';
import { AuthProvider } from './hooks/useAuth';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { LoginScreen } from './components/LoginScreen';
import { ProcessList } from './components/ProcessList';
import { ProcessInstances } from './components/ProcessInstances';
import type { UiPathSDKConfig } from '@uipath/uipath-typescript/core';

const authConfig: UiPathSDKConfig = {
  clientId: import.meta.env.VITE_UIPATH_CLIENT_ID || 'your-client-id',
  orgName: import.meta.env.VITE_UIPATH_ORG_NAME || 'your-organization',
  tenantName: import.meta.env.VITE_UIPATH_TENANT_NAME || 'your-tenant',
  baseUrl: window.location.origin,
  redirectUri: import.meta.env.VITE_UIPATH_REDIRECT_URI || window.location.origin,
  scope: import.meta.env.VITE_UIPATH_SCOPE || 'offline_access',
};

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('processes');

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

  const renderContent = () => {
    switch (activeTab) {
      case 'instances':
        return <ProcessInstances />;
      case 'processes':
      default:
        return <ProcessList />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-[95rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
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

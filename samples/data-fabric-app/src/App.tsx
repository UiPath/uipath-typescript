import { useState } from 'react';
import { AuthProvider } from './hooks/useAuth';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { LoginScreen } from './components/LoginScreen';
import { EntityList } from './components/EntityList';
import { EntityDetails } from './components/EntityDetails';
import { RecordsList } from './components/RecordsList';
import { RecordOperations } from './components/RecordOperations';
import { ChoiceSets } from './components/ChoiceSets';
import type { UiPathSDKConfig, EntityGetResponse } from '@uipath/uipath-typescript';

const authConfig: UiPathSDKConfig = {
  clientId: import.meta.env.VITE_UIPATH_CLIENT_ID || 'your-client-id',
  orgName: import.meta.env.VITE_UIPATH_ORG_NAME || 'your-organization',
  tenantName: import.meta.env.VITE_UIPATH_TENANT_NAME || 'your-tenant',
  baseUrl: import.meta.env.VITE_UIPATH_BASE_URL || 'https://cloud.uipath.com',
  redirectUri: import.meta.env.VITE_UIPATH_REDIRECT_URI || window.location.origin,
  scope: import.meta.env.VITE_UIPATH_SCOPE || 'DataFabric.Schema.Read DataFabric.Data.Read DataFabric.Data.Write offline_access',
};

function AppContent() {
  const { isAuthenticated, isLoading, sdk } = useAuth();
  const [activeTab, setActiveTab] = useState('entities');
  const [selectedEntity, setSelectedEntity] = useState<EntityGetResponse | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="text-gray-600 font-medium">Initializing UiPath SDK...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const handleEntitySelect = (entity: EntityGetResponse) => {
    setSelectedEntity(entity);
  };

  const handleBackToList = () => {
    setSelectedEntity(null);
  };

  const handleDownloadAttachment = async (entityName: string, recordId: string, fieldName: string) => {
    try {
      const blob = await sdk.entities.downloadAttachment({
        entityName,
        recordId,
        fieldName
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entityName}_${recordId}_${fieldName}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download attachment:', err);
      alert('Failed to download attachment: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'entities':
        if (selectedEntity) {
          return <EntityDetails entityId={selectedEntity.id} onBack={handleBackToList} />;
        }
        return (
          <EntityList
            onSelectEntity={handleEntitySelect}
            selectedEntityId={undefined}
          />
        );
      case 'records':
        return <RecordsList onDownloadAttachment={handleDownloadAttachment} />;
      case 'operations':
        return <RecordOperations />;
      case 'choicesets':
        return <ChoiceSets />;
      default:
        return (
          <EntityList
            onSelectEntity={handleEntitySelect}
            selectedEntityId={undefined}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedEntity(null); // Reset selection when changing tabs
        }}
      />
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

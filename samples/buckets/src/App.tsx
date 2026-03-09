import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginForm from './components/LoginForm';
import FileUploader from './components/FileUploader';

function AppContent() {
  const { isAuthenticated, isLoading, configureAndLogin, logout, error, sdk } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Initializing...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={configureAndLogin} error={error} isLoading={isLoading} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">BDO Bucket</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {sdk?.config.orgName} / {sdk?.config.tenantName}
          </span>
          <button
            onClick={logout}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="p-8">
        <FileUploader />
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

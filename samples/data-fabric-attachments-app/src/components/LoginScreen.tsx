import { useAuth } from '../hooks/useAuth';

export const LoginScreen = () => {
  const { login, error, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Fabric Attachments</h1>
          <p className="text-gray-600">Upload, query and download entity file attachments</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={login}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {isLoading ? 'Connecting...' : 'Sign in with UiPath'}
        </button>
      </div>
    </div>
  );
};

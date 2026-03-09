import { useState } from 'react';
import type { UiPathSDKConfig } from '@uipath/uipath-typescript/core';

const HOST_TO_API: Record<string, string> = {
  'cloud.uipath.com': 'https://api.uipath.com',
  'staging.uipath.com': 'https://staging.api.uipath.com',
  'alpha.uipath.com': 'https://alpha.api.uipath.com',
};

function parseTenantUrl(url: string): { baseUrl: string; orgName: string; tenantName: string } {
  const parsed = new URL(url.trim());
  const baseUrl = HOST_TO_API[parsed.hostname] || `https://api.${parsed.hostname}`;
  const segments = parsed.pathname.split('/').filter(Boolean);
  return {
    baseUrl,
    orgName: segments[0] || '',
    tenantName: segments[1] || '',
  };
}

interface LoginFormProps {
  onLogin: (config: UiPathSDKConfig) => Promise<void>;
  error: string | null;
  isLoading: boolean;
}

export default function LoginForm({ onLogin, error, isLoading }: LoginFormProps) {
  const [tenantUrl, setTenantUrl] = useState('');
  const [clientId, setClientId] = useState('');
  const [scopes, setScopes] = useState('OR.Administration');
  const [parseError, setParseError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setParseError(null);

    try {
      const { baseUrl, orgName, tenantName } = parseTenantUrl(tenantUrl);
      if (!orgName || !tenantName) {
        setParseError('URL must include org and tenant: https://cloud.uipath.com/{org}/{tenant}');
        return;
      }
      await onLogin({
        clientId: clientId.trim(),
        orgName,
        tenantName,
        baseUrl,
        redirectUri: window.location.origin,
        scope: scopes.trim(),
      });
    } catch {
      setParseError('Invalid URL format. Expected: https://cloud.uipath.com/{org}/{tenant}');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">BDO Bucket</h1>
        <p className="text-gray-500 text-center mb-6">Connect to UiPath to upload files</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="tenantUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Tenant URL
            </label>
            <input
              id="tenantUrl"
              type="url"
              required
              placeholder="https://cloud.uipath.com/myOrg/myTenant"
              value={tenantUrl}
              onChange={(e) => setTenantUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">
              Client ID
            </label>
            <input
              id="clientId"
              type="text"
              required
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="scopes" className="block text-sm font-medium text-gray-700 mb-1">
              Scopes
            </label>
            <input
              id="scopes"
              type="text"
              required
              value={scopes}
              onChange={(e) => setScopes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {(error || parseError) && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {parseError || error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Connecting...' : 'Login with UiPath'}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { loadOAuthConnection, type ConnectionConfig } from '../sdk/client';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ConnectionPanelProps {
  status: ConnectionStatus;
  statusDetail?: string;
  onConnect: (config: ConnectionConfig) => void;
}

/**
 * Org / tenant / credential entry with fallback to platform-injected defaults.
 *
 * PAT mode: the secret is kept in component state only — never persisted,
 * never echoed into snippets or logs.
 * OAuth mode: public identifiers only (App ID, scopes, redirect URI); the
 * config is restored from sessionStorage after the identity-server redirect.
 */
export function ConnectionPanel({ status, statusDetail, onConnect }: ConnectionPanelProps) {
  // prefill OAuth fields when resuming after a redirect round-trip
  const stored = loadOAuthConnection()?.config;

  const [mode, setMode] = useState<ConnectionConfig['mode']>(stored ? 'oauth' : 'default');
  const [baseUrl, setBaseUrl] = useState(stored?.baseUrl ?? 'https://cloud.uipath.com');
  const [orgName, setOrgName] = useState(stored?.orgName ?? '');
  const [tenantName, setTenantName] = useState(stored?.tenantName ?? '');
  const [secret, setSecret] = useState('');
  const [clientId, setClientId] = useState(stored?.clientId ?? '');
  const [redirectUri, setRedirectUri] = useState(stored?.redirectUri ?? window.location.origin);
  const [scope, setScope] = useState(stored?.scope ?? '');

  const baseReady = baseUrl.trim() !== '' && orgName.trim() !== '' && tenantName.trim() !== '';
  const ready =
    mode === 'default' ||
    (mode === 'custom' && baseReady && secret !== '') ||
    (mode === 'oauth' && baseReady && clientId.trim() !== '' && redirectUri.trim() !== '' && scope.trim() !== '');
  const canConnect = status !== 'connecting' && ready;

  const handleConnect = () => {
    onConnect({ mode, baseUrl, orgName, tenantName, secret, clientId, redirectUri, scope });
  };

  return (
    <section className="panel connection-panel">
      <div className="panel-title-row">
        <h2>Connection</h2>
        <span className={`status-pill status-${status}`}>
          {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting…' : status === 'error' ? 'Error' : 'Not connected'}
        </span>
      </div>

      <div className="mode-toggle" role="radiogroup" aria-label="Connection mode">
        <label className={mode === 'default' ? 'active' : ''}>
          <input type="radio" name="mode" checked={mode === 'default'} onChange={() => setMode('default')} />
          Platform
        </label>
        <label className={mode === 'custom' ? 'active' : ''}>
          <input type="radio" name="mode" checked={mode === 'custom'} onChange={() => setMode('custom')} />
          PAT
        </label>
        <label className={mode === 'oauth' ? 'active' : ''}>
          <input type="radio" name="mode" checked={mode === 'oauth'} onChange={() => setMode('oauth')} />
          OAuth
        </label>
      </div>

      {mode === 'default' && (
        <p className="hint">
          Uses the org, tenant, and auth injected by UiPath Apps when this playground is deployed as a coded app. For
          local development, switch to PAT or OAuth.
        </p>
      )}

      {mode !== 'default' && (
        <div className="connection-form">
          <label>
            Base URL
            <input type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://cloud.uipath.com" autoComplete="off" spellCheck={false} />
          </label>
          <label>
            Organization
            <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="my-org" autoComplete="off" spellCheck={false} />
          </label>
          <label>
            Tenant
            <input type="text" value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="MyTenant" autoComplete="off" spellCheck={false} />
          </label>

          {mode === 'custom' && (
            <>
              <label>
                Personal access token (secret)
                <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="PAT / secret" autoComplete="new-password" />
              </label>
              <p className="hint">
                The secret stays in memory for this tab only — it is never stored, logged, or included in generated
                code snippets. Calls run with this token's permissions.
              </p>
            </>
          )}

          {mode === 'oauth' && (
            <>
              <label>
                Client ID (App ID)
                <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="App ID from your External Application" autoComplete="off" spellCheck={false} />
              </label>
              <label>
                Redirect URI
                <input type="url" value={redirectUri} onChange={(e) => setRedirectUri(e.target.value)} autoComplete="off" spellCheck={false} />
              </label>
              <label>
                Scopes (space-separated)
                <input type="text" value={scope} onChange={(e) => setScope(e.target.value)} placeholder="OR.Tasks OR.Assets DataFabric.Data.Read …" autoComplete="off" spellCheck={false} />
              </label>
              <p className="hint">
                Register a <strong>Non-Confidential</strong> External Application whose redirect URI matches the value
                above exactly. Connecting redirects to the UiPath sign-in page and returns here.
              </p>
            </>
          )}
        </div>
      )}

      <button className="primary" onClick={handleConnect} disabled={!canConnect}>
        {status === 'connected' ? 'Reconnect' : mode === 'oauth' ? 'Sign in & connect' : 'Connect'}
      </button>
      {status === 'error' && statusDetail && <p className="error-text">{statusDetail}</p>}
    </section>
  );
}

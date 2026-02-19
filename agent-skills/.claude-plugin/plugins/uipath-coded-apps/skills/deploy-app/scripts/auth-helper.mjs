#!/usr/bin/env node
/**
 * UiPath OAuth PKCE Auth Helper
 *
 * Replicates the `uipath auth` flow without interactive terminal prompts.
 * Designed to be run by an agent — outputs structured JSON lines to stdout.
 *
 * Usage: node auth-helper.mjs <domain>
 *   domain: cloud | staging | alpha (default: cloud)
 *
 * Output (JSON lines to stdout):
 *   {"step":"auth_url","url":"...","port":8104}
 *   {"step":"code_received"}
 *   {"step":"complete","tokens":{...},"organization":{...},"tenants":[...]}
 *   {"step":"error","message":"..."}   (on failure)
 */

import crypto from 'node:crypto';
import http from 'node:http';
import { exec } from 'node:child_process';

// --- Config ---

const domain = process.argv[2] || 'cloud';

const BASE_URLS = {
  alpha: 'https://alpha.uipath.com',
  cloud: 'https://cloud.uipath.com',
  staging: 'https://staging.uipath.com',
};

const CLIENT_ID = '36dea5b8-e8bb-423d-8e7b-c808df8f1c00';

const SCOPE = [
  'offline_access',
  'ProcessMining',
  'OrchestratorApiUserAccess',
  'StudioWebBackend',
  'IdentityServerApi',
  'ConnectionService',
  'DataService',
  'DocumentUnderstanding',
  'EnterpriseContextService',
  'Directory',
  'JamJamApi',
  'LLMGateway',
  'LLMOps',
  'OMS',
  'RCS.FolderAuthorization',
  'TM.Projects',
  'TM.TestCases',
  'TM.Requirements',
  'TM.TestSets',
].join(' ');

const PORTS = [8104, 8055, 42042];
const AUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// --- Helpers ---

function output(data) {
  process.stdout.write(JSON.stringify(data) + '\n');
}

function base64URLEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generatePKCE() {
  const codeVerifier = base64URLEncode(crypto.randomBytes(32));
  const codeChallenge = base64URLEncode(
    crypto.createHash('sha256').update(codeVerifier).digest()
  );
  const state = base64URLEncode(crypto.randomBytes(32));
  return { codeVerifier, codeChallenge, state };
}

async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.on('error', () => resolve(false));
    server.listen(port, () => {
      server.close();
      resolve(true);
    });
  });
}

async function findAvailablePort() {
  for (const port of PORTS) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(
    `All registered ports (${PORTS.join(', ')}) are in use. Free one up and retry.`
  );
}

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start ""'
        : 'xdg-open';
  exec(`${cmd} "${url}"`, (err) => {
    if (err) {
      output({
        step: 'browser_hint',
        message: `Could not open browser automatically. Please open this URL manually: ${url}`,
      });
    }
  });
}

function startCallbackServer(port, expectedState) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const server = http.createServer((req, res) => {
      const parsed = new URL(req.url, `http://localhost:${port}`);

      if (parsed.pathname === '/oidc/login' && req.method === 'GET') {
        const code = parsed.searchParams.get('code');
        const callbackState = parsed.searchParams.get('state');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          '<html><body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0">' +
            '<div style="text-align:center"><h1>Authentication successful!</h1><p>You can close this tab and return to your terminal.</p></div>' +
            '</body></html>'
        );

        if (!settled) {
          settled = true;
          cleanup();
          if (callbackState !== expectedState) {
            reject(new Error('OAuth state mismatch — possible CSRF. Retry authentication.'));
          } else if (!code) {
            reject(new Error('No authorization code received in callback.'));
          } else {
            resolve(code);
          }
        }
      } else if (parsed.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('Authentication timed out after 5 minutes.'));
      }
    }, AUTH_TIMEOUT_MS);

    function cleanup() {
      clearTimeout(timeout);
      server.close();
    }

    server.on('error', (err) => {
      if (!settled) {
        settled = true;
        reject(new Error(`Callback server error: ${err.message}`));
      }
    });

    server.listen(port, () => {
      // Server ready
    });
  });
}

async function exchangeCodeForTokens(code, port, codeVerifier) {
  const baseUrl = BASE_URLS[domain];
  const tokenUrl = `${baseUrl}/identity_/connect/token`;
  const redirectUri = `http://localhost:${port}/oidc/login`;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: CLIENT_ID,
    code_verifier: codeVerifier,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope,
    idToken: data.id_token,
  };
}

function parseJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT');
  const payload = JSON.parse(
    Buffer.from(parts[1], 'base64').toString('utf-8')
  );
  return {
    sub: payload.sub,
    prtId: payload.prt_id,
    organizationId: payload.organization_id || payload.prt_id,
    email: payload.email,
  };
}

async function fetchTenantsAndOrganization(accessToken) {
  const tokenData = parseJWT(accessToken);
  const orgId = tokenData.prtId || tokenData.organizationId;

  if (!orgId) throw new Error('No organization ID found in token');

  const baseUrl = BASE_URLS[domain];
  const url = `${baseUrl}/${orgId}/portal_/api/filtering/leftnav/tenantsAndOrganizationInfo`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch tenants (${response.status}): ${response.statusText}`
    );
  }

  return response.json();
}

// --- Main ---

async function main() {
  const baseUrl = BASE_URLS[domain];
  if (!baseUrl) {
    throw new Error(`Unknown domain: ${domain}. Use: cloud, staging, or alpha.`);
  }

  // 1. Find available port
  const port = await findAvailablePort();

  // 2. Generate PKCE
  const pkce = generatePKCE();

  // 3. Build auth URL
  const authUrl =
    `${baseUrl}/identity_/connect/authorize?` +
    new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: `http://localhost:${port}/oidc/login`,
      scope: SCOPE,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: 'S256',
      state: pkce.state,
    }).toString();

  // 4. Output auth URL and start server
  output({ step: 'auth_url', url: authUrl, port });

  // Start the callback server (begins listening before we open the browser)
  const codePromise = startCallbackServer(port, pkce.state);

  // 5. Open browser
  openBrowser(authUrl);

  // 6. Wait for callback
  const code = await codePromise;
  output({ step: 'code_received' });

  // 7. Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code, port, pkce.codeVerifier);

  // 8. Fetch tenants and organization
  const tenantsAndOrg = await fetchTenantsAndOrganization(tokens.accessToken);

  // 9. Output everything
  output({
    step: 'complete',
    tokens,
    organization: tenantsAndOrg.organization,
    tenants: tenantsAndOrg.tenants,
  });
}

main().catch((err) => {
  output({ step: 'error', message: err.message });
  process.exit(1);
});

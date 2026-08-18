import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/utils/platform', () => ({
  isBrowser: false,
  isInActionCenter: false,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

vi.mock('@/core/auth/service', () => {
  const AuthService: any = vi.fn().mockImplementation(function () {
    return {
      getTokenManager: () => ({ getToken: () => 'token', hasValidToken: () => true, destroy: vi.fn() }),
      hasValidToken: () => true,
      authenticateWithSecret: vi.fn(),
      authenticate: vi.fn().mockResolvedValue(true),
      logout: vi.fn(),
    };
  });
  AuthService.isInOAuthCallback = vi.fn(() => false);
  return { AuthService };
});

vi.mock('@/core/http/api-client');

import { UiPath } from '@/core/uipath';

const CONTRACT_VARS = [
  'UIPATH_URL', 'UIPATH_BASE_URL', 'UIPATH_ORGANIZATION_ID', 'UIPATH_ORG_ID',
  'UIPATH_ORGANIZATION_NAME', 'UIPATH_ORG_NAME', 'UIPATH_TENANT_ID',
  'UIPATH_TENANT_NAME', 'UIPATH_ACCESS_TOKEN', 'UIPATH_SECRET',
];

const BASE_URL = 'https://alpha.uipath.com';
const ORG_ID = 'org-guid';
const TENANT_ID = 'tenant-guid';
const TOKEN = 'workload-token';

let saved: Record<string, string | undefined>;

function setContract(vars: Record<string, string>): void {
  Object.assign(process.env, vars);
}

beforeEach(() => {
  saved = {};
  for (const key of CONTRACT_VARS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('UiPath zero-config from the execution-context contract', () => {
  it('configures itself from the environment with no constructor arguments', () => {
    setContract({
      UIPATH_URL: BASE_URL,
      UIPATH_ORGANIZATION_NAME: 'my-org',
      UIPATH_TENANT_NAME: 'my-tenant',
      UIPATH_ACCESS_TOKEN: TOKEN,
    });

    const sdk = new UiPath();

    expect(sdk.config.baseUrl).toBe(BASE_URL);
    expect(sdk.config.orgName).toBe('my-org');
    expect(sdk.config.tenantName).toBe('my-tenant');
    expect(sdk.isInitialized()).toBe(true);
  });

  it('accepts the id-based spelling of the contract', () => {
    setContract({
      UIPATH_BASE_URL: BASE_URL,
      UIPATH_ORG_ID: ORG_ID,
      UIPATH_TENANT_ID: TENANT_ID,
      UIPATH_ACCESS_TOKEN: TOKEN,
    });

    const sdk = new UiPath();

    expect(sdk.config.orgName).toBe(ORG_ID);
    expect(sdk.config.tenantName).toBe(TENANT_ID);
  });

  it('never exposes the token on the public config', () => {
    setContract({
      UIPATH_URL: BASE_URL,
      UIPATH_ORG_ID: ORG_ID,
      UIPATH_TENANT_ID: TENANT_ID,
      UIPATH_ACCESS_TOKEN: TOKEN,
    });

    const sdk = new UiPath();

    expect(Object.values(sdk.config)).not.toContain(TOKEN);
    expect(JSON.stringify(sdk.config)).not.toContain(TOKEN);
  });

  it('lets constructor config override the environment', () => {
    setContract({
      UIPATH_URL: 'https://wrong.uipath.com',
      UIPATH_ORGANIZATION_NAME: 'wrong-org',
      UIPATH_TENANT_NAME: 'wrong-tenant',
      UIPATH_ACCESS_TOKEN: TOKEN,
    });

    const sdk = new UiPath({ baseUrl: BASE_URL, orgName: 'right-org', tenantName: 'right-tenant' });

    expect(sdk.config.baseUrl).toBe(BASE_URL);
    expect(sdk.config.orgName).toBe('right-org');
    expect(sdk.config.tenantName).toBe('right-tenant');
  });

  it('completes a partial constructor config from the environment', () => {
    setContract({ UIPATH_URL: BASE_URL, UIPATH_ACCESS_TOKEN: TOKEN });

    const sdk = new UiPath({ orgId: ORG_ID, tenantId: TENANT_ID });

    expect(sdk.config.baseUrl).toBe(BASE_URL);
    expect(sdk.config.orgName).toBe(ORG_ID);
  });
});

describe('UiPath explicit id/token constructor override', () => {
  it('accepts { baseUrl, orgId, tenantId, accessToken }', () => {
    const sdk = new UiPath({ baseUrl: BASE_URL, orgId: ORG_ID, tenantId: TENANT_ID, accessToken: TOKEN });

    expect(sdk.config.orgName).toBe(ORG_ID);
    expect(sdk.config.tenantName).toBe(TENANT_ID);
    expect(sdk.isInitialized()).toBe(true);
  });

  it('still accepts the canonical orgName/tenantName/secret spelling', () => {
    const sdk = new UiPath({ baseUrl: BASE_URL, orgName: 'my-org', tenantName: 'my-tenant', secret: TOKEN });

    expect(sdk.config.orgName).toBe('my-org');
    expect(sdk.isInitialized()).toBe(true);
  });
});

describe('UiPath missing configuration', () => {
  it('throws server-oriented guidance when nothing is configured', async () => {
    const sdk = new UiPath();
    await expect(sdk.initialize()).rejects.toThrow(/UIPATH_URL, UIPATH_ORGANIZATION_ID, UIPATH_TENANT_ID, UIPATH_ACCESS_TOKEN/);
  });

  it('does not mention the browser bundler plugin outside the browser', async () => {
    const sdk = new UiPath();
    await expect(sdk.initialize()).rejects.not.toThrow(/coded-apps plugin/);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/utils/platform', () => ({
  isBrowser: false,
  isInActionCenter: false,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

vi.mock('@/core/auth/service', () => {
  // Object.assign intersects both argument types, so the static property is
  // typed without resorting to `any`.
  const AuthService = Object.assign(
    vi.fn().mockImplementation(function () {
      return {
        getTokenManager: () => ({ getToken: () => 'token', hasValidToken: () => true, destroy: vi.fn() }),
        hasValidToken: () => true,
        authenticateWithSecret: vi.fn(),
        authenticate: vi.fn().mockResolvedValue(true),
        logout: vi.fn(),
      };
    }),
    { isInOAuthCallback: vi.fn(() => false) },
  );
  return { AuthService };
});

vi.mock('@/core/http/api-client');

vi.mock('@/core/config/runtime', () => ({ loadFromMetaTags: vi.fn(() => null) }));

import { UiPath } from '@/core/uipath';
import { loadFromMetaTags } from '@/core/config/runtime';
import type { CodedFunctionContext } from '@/core/config/function-context';
import { clearContractEnv } from '../../utils/env-contract';
import { TEST_CONSTANTS } from '../../utils/constants/common';

const BASE_URL = TEST_CONSTANTS.BASE_URL;
const ORG_ID = TEST_CONSTANTS.ORGANIZATION_ID;
const TENANT_ID = TEST_CONSTANTS.TENANT_ID;
const TOKEN = TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN;

let restoreEnv: () => void;

function setContract(vars: Record<string, string>): void {
  Object.assign(process.env, vars);
}

beforeEach(() => {
  restoreEnv = clearContractEnv();
});

afterEach(() => {
  vi.mocked(loadFromMetaTags).mockReturnValue(null);
  restoreEnv();
});

describe('UiPath zero-config from the execution-context contract', () => {
  it('configures itself from the environment with no constructor arguments', () => {
    setContract({
      UIPATH_BASE_URL: BASE_URL,
      UIPATH_ORG_NAME: 'my-org',
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
      UIPATH_ORG_NAME: ORG_ID,
      UIPATH_TENANT_NAME: TENANT_ID,
      UIPATH_ACCESS_TOKEN: TOKEN,
    });

    const sdk = new UiPath();

    expect(sdk.config.orgName).toBe(ORG_ID);
    expect(sdk.config.tenantName).toBe(TENANT_ID);
  });

  it('never exposes the token on the public config', () => {
    setContract({
      UIPATH_BASE_URL: BASE_URL,
      UIPATH_ORG_NAME: ORG_ID,
      UIPATH_TENANT_NAME: TENANT_ID,
      UIPATH_ACCESS_TOKEN: TOKEN,
    });

    const sdk = new UiPath();

    expect(Object.values(sdk.config)).not.toContain(TOKEN);
    expect(JSON.stringify(sdk.config)).not.toContain(TOKEN);
  });

  it('lets constructor config override the environment', () => {
    setContract({
      UIPATH_BASE_URL: 'https://wrong.uipath.com',
      UIPATH_ORG_NAME: 'wrong-org',
      UIPATH_TENANT_NAME: 'wrong-tenant',
      UIPATH_ACCESS_TOKEN: TOKEN,
    });

    const sdk = new UiPath({ baseUrl: BASE_URL, orgName: 'right-org', tenantName: 'right-tenant' });

    expect(sdk.config.baseUrl).toBe(BASE_URL);
    expect(sdk.config.orgName).toBe('right-org');
    expect(sdk.config.tenantName).toBe('right-tenant');
  });

  it('completes a partial constructor config from the environment', () => {
    setContract({ UIPATH_BASE_URL: BASE_URL, UIPATH_ACCESS_TOKEN: TOKEN });

    const sdk = new UiPath({ orgName: ORG_ID, tenantName: TENANT_ID });

    expect(sdk.config.baseUrl).toBe(BASE_URL);
    expect(sdk.config.orgName).toBe(ORG_ID);
  });
});

describe('UiPath explicit id/token constructor override', () => {
  it('accepts ids in orgName/tenantName and a bearer token in secret', () => {
    const sdk = new UiPath({ baseUrl: BASE_URL, orgName: ORG_ID, tenantName: TENANT_ID, secret: TOKEN });

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

describe('UiPath auth-method precedence across sources', () => {
  const OAUTH = {
    clientId: TEST_CONSTANTS.CLIENT_ID,
    redirectUri: TEST_CONSTANTS.REDIRECT_URI,
    scope: TEST_CONSTANTS.OAUTH_SCOPE,
  };

  it('keeps an explicit OAuth config usable when the environment supplies a token', () => {
    setContract({ UIPATH_ACCESS_TOKEN: TOKEN });

    const sdk = new UiPath({ baseUrl: BASE_URL, orgName: 'my-org', tenantName: 'my-tenant', ...OAUTH });

    expect(sdk.config.orgName).toBe('my-org');
    expect(sdk.isInitialized()).toBe(false); // OAuth defers to initialize(), not secret auto-init
  });

  it('keeps an explicit secret config usable when meta tags supply OAuth fields', () => {
    // Meta tags are the only layer that can carry OAuth, so this is the other
    // reachable cross-layer conflict.
    vi.mocked(loadFromMetaTags).mockReturnValue({
      baseUrl: BASE_URL,
      orgName: 'meta-org',
      tenantName: 'meta-tenant',
      ...OAUTH,
    });

    const sdk = new UiPath({ secret: 'ctor-secret' });

    expect(sdk.isInitialized()).toBe(true); // secret wins, OAuth fields dropped
  });

  it('leaves a single layer carrying both auth methods for validation to reject', async () => {
    const sdk = new UiPath({
      baseUrl: BASE_URL,
      orgName: 'my-org',
      tenantName: 'my-tenant',
      secret: 'ctor-secret',
      ...OAUTH,
    });

    // Contradictory input is not a precedence question — it must not be
    // silently resolved by dropping one of the two.
    await expect(sdk.initialize()).rejects.toThrow();
  });
});

describe('UiPath missing configuration', () => {
  it('points a coded function at the handler context first', async () => {
    const sdk = new UiPath();
    await expect(sdk.initialize()).rejects.toThrow(/new UiPath\(ctx\)/);
  });

  it('also names the environment variables it looks for', async () => {
    const sdk = new UiPath();

    for (const name of ['UIPATH_BASE_URL', 'UIPATH_ORG_NAME', 'UIPATH_TENANT_NAME', 'UIPATH_ACCESS_TOKEN']) {
      await expect(sdk.initialize()).rejects.toThrow(name);
    }
  });

  it('does not mention the browser bundler plugin outside the browser', async () => {
    const sdk = new UiPath();
    await expect(sdk.initialize()).rejects.not.toThrow(/coded-apps plugin/);
  });
});

describe('UiPath constructed from a coded-function context', () => {
  it('configures itself from ctx with no environment present', () => {
    const ctx: CodedFunctionContext = {
      platform: { baseUrl: BASE_URL, orgId: ORG_ID, tenantId: TENANT_ID },
      robot: { accessToken: TOKEN },
    };

    const sdk = new UiPath(ctx);

    expect(sdk.config.baseUrl).toBe(BASE_URL);
    expect(sdk.config.orgName).toBe(ORG_ID);
    expect(sdk.config.tenantName).toBe(TENANT_ID);
    expect(sdk.isInitialized()).toBe(true);
  });

  it('never exposes the workload token on the public config', () => {
    const ctx: CodedFunctionContext = {
      platform: { baseUrl: BASE_URL, orgId: ORG_ID, tenantId: TENANT_ID },
      robot: { accessToken: TOKEN },
    };

    const sdk = new UiPath(ctx);

    expect(JSON.stringify(sdk.config)).not.toContain(TOKEN);
  });

  it('falls through to the environment when the host has no platform, as on a local run', () => {
    setContract({
      UIPATH_BASE_URL: BASE_URL,
      UIPATH_ORG_NAME: ORG_ID,
      UIPATH_TENANT_NAME: TENANT_ID,
      UIPATH_ACCESS_TOKEN: TOKEN,
    });

    const localCtx: CodedFunctionContext = { platform: null, robot: null };
    const sdk = new UiPath(localCtx);

    expect(sdk.config.orgName).toBe(ORG_ID);
    expect(sdk.isInitialized()).toBe(true);
  });

  it('reports missing configuration when neither the host nor the environment has any', async () => {
    const localCtx: CodedFunctionContext = { platform: null, robot: null };
    const sdk = new UiPath(localCtx);

    await expect(sdk.initialize()).rejects.toThrow(/configuration not found/);
  });

  it('still accepts plain configuration objects unchanged', () => {
    const sdk = new UiPath({
      baseUrl: BASE_URL,
      orgName: 'my-org',
      tenantName: 'my-tenant',
      secret: 'pat',
    });

    expect(sdk.config.orgName).toBe('my-org');
    expect(sdk.isInitialized()).toBe(true);
  });
});

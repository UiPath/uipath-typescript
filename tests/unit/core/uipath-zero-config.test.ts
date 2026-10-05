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
import { getPrivateSDK } from '../../utils/setup';
import { TEST_CONSTANTS } from '../../utils/constants/common';
import { functionContext, TEST_PLATFORM } from '../../utils/function-context';

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

  it('rejects a single layer carrying both auth methods at construction', () => {
    // Contradictory input is not a precedence question — it must not be
    // silently resolved by dropping one of the two, and deferring it would
    // first surface at an unrelated service constructor.
    expect(() => new UiPath({
      baseUrl: BASE_URL,
      orgName: 'my-org',
      tenantName: 'my-tenant',
      secret: 'ctor-secret',
      ...OAUTH,
    })).toThrow(/carries both authentication methods/);
  });

  it('names the constructor argument as the source of every field it supplied', () => {
    const construct = () => new UiPath({
      baseUrl: BASE_URL,
      orgName: 'my-org',
      tenantName: 'my-tenant',
      secret: 'ctor-secret',
      ...OAUTH,
    });

    expect(construct).toThrow('secret: the constructor argument');
    expect(construct).toThrow('clientId: the constructor argument');
    expect(construct).toThrow('redirectUri: the constructor argument');
    expect(construct).toThrow('scope: the constructor argument');
    expect(construct).toThrow('Remove clientId, redirectUri, scope from the constructor argument');
  });

  it('rejects a conflict assembled across the constructor and meta tags, naming each side', () => {
    // The reported scenario: a coded app passes a secret while the plugin has
    // already injected the OAuth meta tags, and also names one OAuth field.
    vi.mocked(loadFromMetaTags).mockReturnValue({
      baseUrl: BASE_URL,
      orgName: 'meta-org',
      tenantName: 'meta-tenant',
      ...OAUTH,
    });

    const construct = () => new UiPath({ secret: 'ctor-secret', scope: OAUTH.scope });

    expect(construct).toThrow(/carries both authentication methods/);
    expect(construct).toThrow('secret: the constructor argument');
    expect(construct).toThrow('scope: the constructor argument');
    expect(construct).toThrow('clientId: <meta name="uipath:client-id">');
    expect(construct).toThrow('redirectUri: <meta name="uipath:redirect-uri">');
    expect(construct).toThrow('Remove scope from the constructor argument');
  });

  it('keeps a secret config with one OAuth field usable when no OAuth is injected', () => {
    // The contradiction is a secret plus a COMPLETE OAuth config. Widening it
    // to any single OAuth field would reject the SDK's own documented shapes,
    // where the stray field is simply dropped.
    const sdk = new UiPath({
      baseUrl: BASE_URL,
      orgName: 'my-org',
      tenantName: 'my-tenant',
      secret: TOKEN,
      scope: OAUTH.scope,
    });

    expect(sdk.isInitialized()).toBe(true);
  });

  it('accepts a secret with explicitly-undefined OAuth fields', () => {
    // Object spread keeps a key whose value is `undefined`, so the conflict
    // must be read by truthiness — never by key presence.
    vi.mocked(loadFromMetaTags).mockReturnValue({
      baseUrl: BASE_URL,
      orgName: 'meta-org',
      tenantName: 'meta-tenant',
      ...OAUTH,
    });

    const sdk = new UiPath({ secret: TOKEN, clientId: undefined, redirectUri: undefined, scope: undefined });

    expect(sdk.isInitialized()).toBe(true);
  });

  it('treats an empty-string auth value as absent', () => {
    // A host-auth deployment injects empty `uipath:client-id`/`uipath:scope`
    // tags and compactConfig keeps empty strings, so an empty value must not
    // count as naming a method.
    vi.mocked(loadFromMetaTags).mockReturnValue({
      baseUrl: BASE_URL,
      orgName: 'meta-org',
      tenantName: 'meta-tenant',
      ...OAUTH,
    });

    const sdk = new UiPath({ secret: '' });

    // `config` is populated only when a complete config was resolved, so it is
    // what distinguishes "resolved to OAuth" from "deferred with nothing".
    expect(sdk.config.orgName).toBe('meta-org');
    expect(sdk.isInitialized()).toBe(false); // resolves to the injected OAuth
  });

  it('reports the conflict from initialize() when meta tags arrive after construction', async () => {
    const sdk = new UiPath({ secret: TOKEN, scope: OAUTH.scope });

    vi.mocked(loadFromMetaTags).mockReturnValue({
      baseUrl: BASE_URL,
      orgName: 'meta-org',
      tenantName: 'meta-tenant',
      ...OAUTH,
    });

    await expect(sdk.initialize()).rejects.toThrow(/carries both authentication methods/);
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

  it('reports which fields are missing when a partial config was found', async () => {
    // The only assertion that a config WAS found is reported as such rather
    // than as "not found" — without it the gap diagnostic is unreachable in
    // production and drifts into dead code at the next refactor.
    const sdk = new UiPath({ baseUrl: BASE_URL, clientId: TEST_CONSTANTS.CLIENT_ID });

    await expect(sdk.initialize()).rejects.toThrow(/configuration is incomplete/);
    await expect(sdk.initialize()).rejects.toThrow(/missing orgName, tenantName/);
    await expect(sdk.initialize()).rejects.toThrow(/redirectUri, scope missing/);
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

    await expect(sdk.initialize()).rejects.toThrow(/configuration is incomplete/);
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

  it('reduces a tenant-scoped context baseUrl to its origin', () => {
    const sdk = new UiPath(functionContext({ platform: { ...TEST_PLATFORM, baseUrl: TEST_CONSTANTS.BASE_URL_WITH_PATH } }));

    expect(sdk.config.baseUrl).toBe(BASE_URL);
  });

  it('keeps a baseUrl passed directly as given, path and all', () => {
    // Only the context's baseUrl is reduced: the host supplies it and the function author cannot
    // correct it. A baseUrl passed directly is the caller's own.
    const sdk = new UiPath({
      baseUrl: TEST_CONSTANTS.BASE_URL_WITH_PATH,
      orgName: ORG_ID,
      tenantName: TENANT_ID,
      secret: TOKEN,
    });

    expect(sdk.config.baseUrl).toBe(TEST_CONSTANTS.BASE_URL_WITH_PATH);
  });

  it('treats a context baseUrl that is not http(s) as missing and names it', async () => {
    const sdk = new UiPath(functionContext({ platform: { ...TEST_PLATFORM, baseUrl: TEST_CONSTANTS.BASE_URL_NON_HTTP } }));

    expect(sdk.isInitialized()).toBe(false);
    await expect(sdk.initialize()).rejects.toThrow(
      `ctx.platform.baseUrl "${TEST_CONSTANTS.BASE_URL_NON_HTTP}" is not an http(s) URL`,
    );
  });

  it('lets the environment fill a coordinate the context left blank', () => {
    setContract({ UIPATH_ORG_NAME: ORG_ID });

    const sdk = new UiPath(functionContext({ platform: { ...TEST_PLATFORM, orgId: '' } }));

    expect(sdk.config.orgName).toBe(ORG_ID);
    expect(sdk.isInitialized()).toBe(true);
  });

  it('names the missing workload token when the context has no robot identity', async () => {
    const sdk = new UiPath(functionContext({ robot: null }));

    await expect(sdk.initialize()).rejects.toThrow(/ctx\.robot\.accessToken is null/);
    await expect(sdk.initialize()).rejects.not.toThrow(/pass the handler context/);
  });

  it('names a null platform when a token arrived without coordinates', async () => {
    const sdk = new UiPath(functionContext({ platform: null }));

    await expect(sdk.initialize()).rejects.toThrow(/ctx\.platform is null/);
    await expect(sdk.initialize()).rejects.not.toThrow(/ctx\.robot\.accessToken/);
  });

  it('completes a token-only context from the environment coordinates', () => {
    setContract({ UIPATH_BASE_URL: BASE_URL, UIPATH_ORG_NAME: ORG_ID, UIPATH_TENANT_NAME: TENANT_ID });

    const sdk = new UiPath(functionContext({ platform: null }));

    expect(sdk.config.orgName).toBe(ORG_ID);
    expect(sdk.isInitialized()).toBe(true);
  });
});

describe('UiPath folder scope from a coded-function context', () => {
  const context = (folderKey?: string | null): CodedFunctionContext =>
    functionContext({ platform: { ...TEST_PLATFORM, folderKey } });

  it('uses the invocation folder as the default folder scope', () => {
    const sdk = new UiPath(context(TEST_CONSTANTS.FOLDER_KEY));

    expect(getPrivateSDK(sdk).folderKey).toBe(TEST_CONSTANTS.FOLDER_KEY);
  });

  it('trims the folder key it was handed', () => {
    const sdk = new UiPath(context(` ${TEST_CONSTANTS.FOLDER_KEY} `));

    expect(getPrivateSDK(sdk).folderKey).toBe(TEST_CONSTANTS.FOLDER_KEY);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty', ''],
    ['whitespace-only', TEST_CONSTANTS.FOLDER_KEY_WHITESPACE],
  ])('treats a %s folder key as no folder scope', (_label, folderKey) => {
    const sdk = new UiPath(context(folderKey));

    expect(getPrivateSDK(sdk).folderKey).toBeUndefined();
  });

  it('prefers the invocation folder over a meta-tag folder key', () => {
    // Constructor input beats meta tags for every other coordinate; the folder key follows.
    vi.mocked(loadFromMetaTags).mockReturnValue({ folderKey: TEST_CONSTANTS.META_FOLDER_KEY });

    const sdk = new UiPath(context(TEST_CONSTANTS.FOLDER_KEY));

    expect(getPrivateSDK(sdk).folderKey).toBe(TEST_CONSTANTS.FOLDER_KEY);
  });

  it('leaves the invocation folder out of the Integration Service fallback', () => {
    const sdk = new UiPath(context(TEST_CONSTANTS.FOLDER_KEY));

    expect(getPrivateSDK(sdk).metaFolderKey).toBeUndefined();
  });

  it('keeps the meta-tag folder key as the Integration Service fallback beside a context folder', () => {
    vi.mocked(loadFromMetaTags).mockReturnValue({ folderKey: TEST_CONSTANTS.META_FOLDER_KEY });

    const sdk = new UiPath(context(TEST_CONSTANTS.FOLDER_KEY));

    expect(getPrivateSDK(sdk).metaFolderKey).toBe(TEST_CONSTANTS.META_FOLDER_KEY);
  });

  it('keeps the meta-tag folder key when the context names none', () => {
    vi.mocked(loadFromMetaTags).mockReturnValue({ folderKey: TEST_CONSTANTS.META_FOLDER_KEY });

    const sdk = new UiPath(context(null));

    expect(getPrivateSDK(sdk).folderKey).toBe(TEST_CONSTANTS.META_FOLDER_KEY);
  });

  it('keeps the invocation folder when the configuration completes on initialize()', async () => {
    // Incomplete at construction (no token); the deferred path re-reads meta tags, which must not
    // wipe a folder key that came from the context.
    const sdk = new UiPath(functionContext({
      platform: { ...TEST_PLATFORM, folderKey: TEST_CONSTANTS.FOLDER_KEY },
      robot: null,
    }));
    setContract({ UIPATH_ACCESS_TOKEN: TOKEN });

    await sdk.initialize();

    expect(getPrivateSDK(sdk).folderKey).toBe(TEST_CONSTANTS.FOLDER_KEY);
  });

  it('keeps the invocation folder when the coordinates come from the environment', () => {
    // A folder-only context has nothing to configure with, so the environment does; the folder key
    // still applies.
    setContract({
      UIPATH_BASE_URL: BASE_URL,
      UIPATH_ORG_NAME: ORG_ID,
      UIPATH_TENANT_NAME: TENANT_ID,
      UIPATH_ACCESS_TOKEN: TOKEN,
    });

    const sdk = new UiPath(functionContext({
      platform: { baseUrl: '', orgId: '', tenantId: '', folderKey: TEST_CONSTANTS.FOLDER_KEY },
      robot: null,
    }));

    expect(sdk.isInitialized()).toBe(true);
    expect(getPrivateSDK(sdk).folderKey).toBe(TEST_CONSTANTS.FOLDER_KEY);
  });
});

import { describe, it, expect, afterEach, vi } from 'vitest';
import { conflictingAuthMessage, missingConfigMessage, nonBlank, toHttpOrigin } from '@/core/config/config-utils';
import { UiPathEnvVars } from '@/core/config/environment';
import type { PartialUiPathConfig } from '@/core/config/sdk-config';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { functionContext, TEST_PLATFORM } from '../../../utils/function-context';

const BASE_URL = TEST_CONSTANTS.BASE_URL;
const TOKEN = TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN;
const OAUTH = {
  clientId: TEST_CONSTANTS.CLIENT_ID,
  redirectUri: TEST_CONSTANTS.REDIRECT_URI,
  scope: TEST_CONSTANTS.OAUTH_SCOPE,
};

describe('nonBlank', () => {
  it('returns the value trimmed', () => {
    expect(nonBlank(` ${TEST_CONSTANTS.FOLDER_KEY} `)).toBe(TEST_CONSTANTS.FOLDER_KEY);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty', ''],
    ['whitespace-only', TEST_CONSTANTS.FOLDER_KEY_WHITESPACE],
  ])('treats a %s value as absent', (_label, value) => {
    expect(nonBlank(value)).toBeUndefined();
  });
});

describe('toHttpOrigin', () => {
  it.each([
    ['a bare origin', TEST_CONSTANTS.BASE_URL],
    ['a trailing slash', TEST_CONSTANTS.BASE_URL_TRAILING_SLASH],
    ['a path', TEST_CONSTANTS.BASE_URL_WITH_PATH],
    ['a query string', TEST_CONSTANTS.BASE_URL_WITH_QUERY],
    ['a fragment', TEST_CONSTANTS.BASE_URL_WITH_HASH],
  ])('reduces a URL with %s to its origin', (_label, value) => {
    expect(toHttpOrigin(value)).toBe(TEST_CONSTANTS.BASE_URL);
  });

  it('keeps an explicit port', () => {
    expect(toHttpOrigin(TEST_CONSTANTS.BASE_URL_WITH_PORT)).toBe(TEST_CONSTANTS.BASE_URL_WITH_PORT);
  });

  it.each([
    ['a non-http(s) scheme', TEST_CONSTANTS.BASE_URL_NON_HTTP],
    ['a value that is not a URL', TEST_CONSTANTS.BASE_URL_NOT_A_URL],
  ])('returns null for %s, and says so', (_label, value) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(toHttpOrigin(value)).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain(value);

    warn.mockRestore();
  });
});

describe('conflictingAuthMessage', () => {
  it('attributes each field to the layer that supplied it', () => {
    const message = conflictingAuthMessage({
      config: { secret: TOKEN },
      metaConfig: { baseUrl: BASE_URL, ...OAUTH },
    });

    expect(message).toContain('secret: the constructor argument');
    // All three meta-tag labels, so a mistyped entry in AUTH_FIELD_SOURCES
    // cannot ship silently.
    expect(message).toContain('clientId: <meta name="uipath:client-id">');
    expect(message).toContain('redirectUri: <meta name="uipath:redirect-uri">');
    expect(message).toContain('scope: <meta name="uipath:scope">');
    // No value from the meta layer either — labels only.
    expect(message).not.toContain(OAUTH.clientId);
    expect(message).not.toContain(OAUTH.redirectUri);
    expect(message).not.toContain(OAUTH.scope);
  });

  it('names the constructor argument for the fields it supplied over the meta tags', () => {
    const message = conflictingAuthMessage({
      config: { secret: TOKEN, scope: OAUTH.scope },
      metaConfig: { baseUrl: BASE_URL, ...OAUTH },
    });

    expect(message).toContain('secret: the constructor argument');
    expect(message).toContain('scope: the constructor argument');
    expect(message).toContain('clientId: <meta name="uipath:client-id">');
    expect(message).toContain('redirectUri: <meta name="uipath:redirect-uri">');
  });

  it('names the environment variable when the token came from the environment', () => {
    // Unreachable through the constructor in production, because the
    // environment and meta layers are mutually exclusive — this is the only
    // coverage the `secret` table entry has. Do not delete it as dead.
    const message = conflictingAuthMessage({
      environment: { baseUrl: BASE_URL, secret: TOKEN },
      metaConfig: { ...OAUTH },
    });

    expect(message).toContain('secret: the UIPATH_ACCESS_TOKEN environment variable');
    expect(message).toContain('clientId: <meta name="uipath:client-id">');
    // The environment branch carries the bearer token: label, never value.
    expect(message).not.toContain(TOKEN);
  });

  it('never echoes the secret value', () => {
    // The message reaches browser consoles and log pipelines, and `secret` is
    // a bearer token: every label is a field name plus a layer name.
    const message = conflictingAuthMessage({ config: { secret: TOKEN, ...OAUTH } });

    expect(message).not.toContain(TOKEN);
    expect(message).not.toContain(OAUTH.clientId);
  });

  it('names the OAuth fields the caller can drop', () => {
    const message = conflictingAuthMessage({
      config: { secret: TOKEN, clientId: OAUTH.clientId, scope: OAUTH.scope },
      metaConfig: { redirectUri: OAUTH.redirectUri },
    });

    expect(message).toContain('Remove clientId, scope from the constructor argument');
  });

  it('falls back to generic guidance when the constructor argument named no OAuth field', () => {
    const message = conflictingAuthMessage({
      environment: { secret: TOKEN },
      metaConfig: { ...OAUTH },
    });

    expect(message).toContain('Pass exactly one authentication method.');
    // Never a dangling `Remove  from ...` when the caller named nothing.
    expect(message).not.toContain('Remove ');
  });
});

describe('missingConfigMessage', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@/utils/platform');
  });

  it('is byte-identical to the existing text when nothing was found', async () => {
    expect(missingConfigMessage()).toBe(
      'UiPath SDK configuration not found. ' +
      'In a UiPath coded function, pass the handler context: new UiPath(ctx). ' +
      'Otherwise pass { baseUrl, orgName, tenantName, secret }, ' +
      'or set UIPATH_BASE_URL, UIPATH_ORG_NAME, UIPATH_TENANT_NAME and UIPATH_ACCESS_TOKEN.',
    );

    // The browser branch reads a module-level flag, so re-mock and re-import to
    // reach it.
    vi.resetModules();
    vi.doMock('@/utils/platform', () => ({ isBrowser: true }));
    const browser = await import('@/core/config/config-utils');

    expect(browser.missingConfigMessage()).toBe(
      'UiPath SDK configuration not found. ' +
      'Ensure @uipath/coded-apps plugin is set up in your bundler to inject configuration during development and build.',
    );
  });

  it('reports which OAuth fields are missing instead of claiming nothing was found', () => {
    const message = missingConfigMessage({
      baseUrl: BASE_URL,
      orgName: 'my-org',
      tenantName: 'my-tenant',
      clientId: OAUTH.clientId,
      scope: OAUTH.scope,
    });

    expect(message).toContain('is incomplete');
    expect(message).toContain('redirectUri');
    expect(message).not.toContain('not found');
  });

  it('does not claim the OAuth configuration is incomplete when it is complete', () => {
    // A complete OAuth set beside a missing base field is not an OAuth gap;
    // reporting it as one rendered `scope set,  missing`, naming nothing.
    const message = missingConfigMessage({ baseUrl: BASE_URL, tenantName: 'my-tenant', ...OAUTH });

    expect(message).toContain('UiPath SDK configuration is incomplete: missing orgName.');
    expect(message).not.toContain('the OAuth configuration is incomplete');
    expect(message).not.toMatch(/\bset,\s{2,}missing\b/);
  });

  it('reports missing base fields and the absent auth method together', () => {
    const message = missingConfigMessage({ baseUrl: '', orgName: '', tenantName: '', secret: '' });

    expect(message).toContain('missing baseUrl, orgName, tenantName');
    expect(message).toContain('no authentication method set');
  });
});

describe('missingConfigMessage with a handler context', () => {
  it('names a null platform and a null token when the context carried neither', () => {
    const message = missingConfigMessage(undefined, functionContext({ platform: null, robot: null }));

    // A context was passed, so the configuration is incomplete rather than not found.
    expect(message).toMatch(/^UiPath SDK configuration is incomplete: /);
    expect(message).not.toContain('not found');
    expect(message).toContain(
      `ctx.platform is null (or set ${UiPathEnvVars.BASE_URL}, ${UiPathEnvVars.ORG_NAME} and ${UiPathEnvVars.TENANT_NAME})`,
    );
    expect(message).toContain(`ctx.robot.accessToken is null (or set ${UiPathEnvVars.ACCESS_TOKEN})`);
    expect(message).not.toContain('pass the handler context');
  });

  it('names only the variables the environment left unset when the platform is null', () => {
    const merged: PartialUiPathConfig = {
      baseUrl: TEST_CONSTANTS.BASE_URL,
      orgName: TEST_CONSTANTS.ORGANIZATION_ID,
      secret: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN,
    };

    const message = missingConfigMessage(merged, functionContext({ platform: null }));

    expect(message).toContain(`ctx.platform is null (or set ${UiPathEnvVars.TENANT_NAME})`);
    expect(message).not.toContain(UiPathEnvVars.BASE_URL);
    expect(message).not.toContain(UiPathEnvVars.ORG_NAME);
  });

  it('names only the platform when the context handed over a token without coordinates', () => {
    // The token reached the merged configuration; the platform did not.
    const merged: PartialUiPathConfig = { secret: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN };

    const message = missingConfigMessage(merged, functionContext({ platform: null }));

    expect(message).toContain('ctx.platform is null');
    expect(message).not.toContain('ctx.robot.accessToken');
  });

  it('names the platform coordinates the merged configuration still lacks', () => {
    const context = functionContext({ platform: { ...TEST_PLATFORM, baseUrl: '', tenantId: '' } });
    const merged: PartialUiPathConfig = {
      orgName: TEST_CONSTANTS.ORGANIZATION_ID,
      secret: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN,
    };

    const message = missingConfigMessage(merged, context);

    expect(message).toContain(`ctx.platform.baseUrl is empty (or set ${UiPathEnvVars.BASE_URL})`);
    expect(message).toContain(`ctx.platform.tenantId is empty (or set ${UiPathEnvVars.TENANT_NAME})`);
    expect(message).not.toContain('ctx.platform.orgId');
    expect(message).not.toContain('ctx.robot.accessToken');
  });

  it('names a base URL that is not http(s), with its value', () => {
    const context = functionContext({ platform: { ...TEST_PLATFORM, baseUrl: TEST_CONSTANTS.BASE_URL_NON_HTTP } });
    const merged: PartialUiPathConfig = {
      orgName: TEST_CONSTANTS.ORGANIZATION_ID,
      tenantName: TEST_CONSTANTS.TENANT_ID,
      secret: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN,
    };

    const message = missingConfigMessage(merged, context);

    expect(message).toContain(
      `ctx.platform.baseUrl "${TEST_CONSTANTS.BASE_URL_NON_HTTP}" is not an http(s) URL (or set ${UiPathEnvVars.BASE_URL})`,
    );
  });

  it('names a missing workload token as ctx.robot.accessToken', () => {
    const merged: PartialUiPathConfig = {
      baseUrl: TEST_PLATFORM.baseUrl,
      orgName: TEST_PLATFORM.orgId,
      tenantName: TEST_PLATFORM.tenantId,
    };

    const message = missingConfigMessage(merged, functionContext({ robot: null }));

    expect(message).toContain(`ctx.robot.accessToken is null (or set ${UiPathEnvVars.ACCESS_TOKEN})`);
    expect(message).not.toContain('ctx.platform');
  });

  it('does not name a coordinate the environment supplied', () => {
    // The context lacks a token, but the merged configuration got one from UIPATH_ACCESS_TOKEN.
    const context = functionContext({ platform: { ...TEST_PLATFORM, orgId: '' }, robot: null });
    const merged: PartialUiPathConfig = {
      baseUrl: TEST_PLATFORM.baseUrl,
      tenantName: TEST_PLATFORM.tenantId,
      secret: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN,
    };

    const message = missingConfigMessage(merged, context);

    expect(message).toContain('ctx.platform.orgId is empty');
    expect(message).not.toContain('ctx.robot.accessToken');
  });

  it('does not claim variables were named when nothing is missing', () => {
    // Complete coordinates carrying both authentication methods: incomplete, yet nothing is absent.
    // The constructor rejects this merge before asking for a message; only a direct call lands here.
    const merged: PartialUiPathConfig = {
      baseUrl: TEST_CONSTANTS.BASE_URL,
      orgName: TEST_CONSTANTS.ORGANIZATION_ID,
      tenantName: TEST_CONSTANTS.TENANT_ID,
      secret: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN,
      ...OAUTH,
    };

    const message = missingConfigMessage(merged, functionContext());

    expect(message).toMatch(/configuration is incomplete/);
    expect(message).toContain('does not form a complete configuration');
    expect(message).not.toContain('variables named');
  });
});

import { describe, it, expect, afterEach, vi } from 'vitest';
import { conflictingAuthMessage, missingConfigMessage } from '@/core/config/config-utils';
import { TEST_CONSTANTS } from '../../../utils/constants/common';

const BASE_URL = TEST_CONSTANTS.BASE_URL;
const TOKEN = TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN;
const OAUTH = {
  clientId: TEST_CONSTANTS.CLIENT_ID,
  redirectUri: TEST_CONSTANTS.REDIRECT_URI,
  scope: TEST_CONSTANTS.OAUTH_SCOPE,
};

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

  it('falls back to generic guidance when no layer named an OAuth field', () => {
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

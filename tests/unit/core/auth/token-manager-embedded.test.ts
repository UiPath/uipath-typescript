import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenManager } from '@/core/auth/token-manager';
import { ExecutionContext } from '@/core/context/execution';
import type { Config } from '@/core/config/config';
import { TEST_CONSTANTS } from '@tests/utils/constants/common';

// ---------------------------------------------------------------------------
// Mock platform — control isInActionCenter, isHostEmbedded, embeddingOrigin
// ---------------------------------------------------------------------------
vi.mock('@/utils/platform', () => ({
  isBrowser: true,
  isInActionCenter: false,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

import * as platform from '@/utils/platform';

// ---------------------------------------------------------------------------
// Mock EmbeddedTokenManager
// ---------------------------------------------------------------------------
const mockEmbeddedRefresh = vi.fn();
const mockEmbeddedDestroy = vi.fn();

vi.mock('@/core/auth/embedded-token-manager', () => ({
  EmbeddedTokenManager: vi.fn().mockImplementation(function () { return ({
    refreshAccessToken: mockEmbeddedRefresh,
    destroy: mockEmbeddedDestroy,
  }); }),
}));

import { EmbeddedTokenManager } from '@/core/auth/embedded-token-manager';

// TokenManager reads the trustedEmbeddingOrigin const at construction time.
// Expose it as a getter that derives from the (mocked) platform flags, so tests
// keep driving the scenario by mutating platform.isHostEmbedded / embeddingOrigin.
vi.mock('@/core/auth/host-token-request', async () => {
  const platform = await import('@/utils/platform');
  const ALLOWED = ['https://cloud.uipath.com', 'https://alpha.uipath.com', 'https://staging.uipath.com'];
  const isValidHostOrigin = (origin: string | null): boolean => !!origin && ALLOWED.includes(origin);
  return {
    isValidHostOrigin: vi.fn(isValidHostOrigin),
    isTokenExpired: vi.fn(() => false),
    get trustedEmbeddingOrigin() {
      return platform.isHostEmbedded && platform.embeddingOrigin && isValidHostOrigin(platform.embeddingOrigin)
        ? platform.embeddingOrigin
        : null;
    },
  };
});

// ---------------------------------------------------------------------------
// Mock ActionCenterTokenManager
// ---------------------------------------------------------------------------
vi.mock('@/core/auth/action-center-token-manager', () => ({
  ActionCenterTokenManager: vi.fn().mockImplementation(function () { return ({
    refreshAccessToken: vi.fn().mockResolvedValue('ac-token'),
  }); }),
}));

import { ActionCenterTokenManager } from '@/core/auth/action-center-token-manager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeManager() {
  const context = new ExecutionContext();
  const config: Config = {
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName: TEST_CONSTANTS.TENANT_ID,
    secret: TEST_CONSTANTS.CLIENT_SECRET,
  };
  return new TokenManager(context, config, false);
}

const PARENT_ORIGIN = 'https://cloud.uipath.com';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('TokenManager — EmbeddedTokenManager wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Instantiation: EmbeddedTokenManager ----

  it('does not instantiate EmbeddedTokenManager when ?host=embed is absent', () => {
    vi.mocked(platform).isInActionCenter = false;
    vi.mocked(platform).isHostEmbedded = false;
    vi.mocked(platform).embeddingOrigin = PARENT_ORIGIN;
    makeManager();
    expect(EmbeddedTokenManager).not.toHaveBeenCalled();
  });

  it('does not instantiate EmbeddedTokenManager when basedomain is not a trusted UiPath origin', () => {
    vi.mocked(platform).isInActionCenter = false;
    vi.mocked(platform).isHostEmbedded = true;
    vi.mocked(platform).embeddingOrigin = 'https://evil.example.com';
    makeManager();
    expect(EmbeddedTokenManager).not.toHaveBeenCalled();
  });

  it('does not instantiate EmbeddedTokenManager when embeddingOrigin is null', () => {
    vi.mocked(platform).isInActionCenter = false;
    vi.mocked(platform).isHostEmbedded = true;
    vi.mocked(platform).embeddingOrigin = null;
    makeManager();
    expect(EmbeddedTokenManager).not.toHaveBeenCalled();
  });

  it('instantiates EmbeddedTokenManager when ?host=embed is present and embeddingOrigin is trusted', () => {
    vi.mocked(platform).isInActionCenter = false;
    vi.mocked(platform).isHostEmbedded = true;
    vi.mocked(platform).embeddingOrigin = PARENT_ORIGIN;
    makeManager();
    expect(EmbeddedTokenManager).toHaveBeenCalledOnce();
    expect(EmbeddedTokenManager).toHaveBeenCalledWith(PARENT_ORIGIN, expect.any(Object), expect.any(Function));
    expect(ActionCenterTokenManager).not.toHaveBeenCalled();
  });

  // ---- Instantiation: ActionCenterTokenManager (unchanged) ----

  it('instantiates ActionCenterTokenManager (not EmbeddedTokenManager) when isInActionCenter', () => {
    vi.mocked(platform).isInActionCenter = true;
    vi.mocked(platform).isHostEmbedded = true;
    vi.mocked(platform).embeddingOrigin = PARENT_ORIGIN;
    makeManager();
    expect(ActionCenterTokenManager).toHaveBeenCalledOnce();
    expect(EmbeddedTokenManager).not.toHaveBeenCalled();
  });

  // ---- getValidToken routing ----

  it('getValidToken delegates to EmbeddedTokenManager when instantiated', async () => {
    vi.mocked(platform).isInActionCenter = false;
    vi.mocked(platform).isHostEmbedded = true;
    vi.mocked(platform).embeddingOrigin = PARENT_ORIGIN;
    mockEmbeddedRefresh.mockResolvedValue('embedded-token');

    const manager = makeManager();
    const tokenInfo = { token: 'old', type: 'secret' as const, expiresAt: new Date(0) };
    manager.setToken(tokenInfo);

    const result = await manager.getValidToken();
    expect(result).toBe('embedded-token');
    expect(mockEmbeddedRefresh).toHaveBeenCalledWith(tokenInfo);
  });

  it('getValidToken falls through to secret path when not host-embedded', async () => {
    vi.mocked(platform).isInActionCenter = false;
    vi.mocked(platform).isHostEmbedded = false;
    vi.mocked(platform).embeddingOrigin = null;

    const manager = makeManager();
    manager.setToken({ token: 'my-secret', type: 'secret' as const });

    const result = await manager.getValidToken();
    expect(result).toBe('my-secret');
    expect(mockEmbeddedRefresh).not.toHaveBeenCalled();
  });

  // ---- destroy ----

  it('destroy() delegates to EmbeddedTokenManager.destroy()', () => {
    vi.mocked(platform).isInActionCenter = false;
    vi.mocked(platform).isHostEmbedded = true;
    vi.mocked(platform).embeddingOrigin = PARENT_ORIGIN;
    const manager = makeManager();
    manager.destroy();
    expect(mockEmbeddedDestroy).toHaveBeenCalledOnce();
  });

  it('destroy() is a no-op when EmbeddedTokenManager is not instantiated', () => {
    vi.mocked(platform).isHostEmbedded = false;
    vi.mocked(platform).embeddingOrigin = null;
    const manager = makeManager();
    expect(() => manager.destroy()).not.toThrow();
  });
});

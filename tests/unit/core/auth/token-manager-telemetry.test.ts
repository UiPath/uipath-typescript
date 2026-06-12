import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenManager } from '@/core/auth/token-manager';
import { ExecutionContext } from '@/core/context/execution';
import type { Config } from '@/core/config/config';
import { telemetryClient } from '@/core/telemetry';
import { TEST_CONSTANTS } from '@tests/utils/constants/common';
import { TEST_USER_ID, createTestJwt } from '@tests/utils/jwt';

// ---------------------------------------------------------------------------
// Mock platform — plain (non-embedded, non-Action-Center) environment
// ---------------------------------------------------------------------------
vi.mock('@/utils/platform', () => ({
  isBrowser: false,
  isInActionCenter: false,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('TokenManager — telemetry user id wiring', () => {
  let setUserIdSpy!: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setUserIdSpy = vi.spyOn(telemetryClient, 'setUserId').mockImplementation(() => {});
  });

  afterEach(() => {
    setUserIdSpy.mockRestore();
  });

  it('feeds the user id extracted from a JWT token to telemetry on setToken', () => {
    const manager = makeManager();

    manager.setToken({
      token: createTestJwt({ sub: TEST_USER_ID }),
      type: 'oauth',
    });

    expect(setUserIdSpy).toHaveBeenCalledTimes(1);
    expect(setUserIdSpy).toHaveBeenCalledWith(TEST_USER_ID);
  });

  it('feeds an empty user id to telemetry for an opaque (non-JWT) token', () => {
    const manager = makeManager();

    manager.setToken({
      token: 'rt_opaque-personal-access-token',
      type: 'secret',
    });

    expect(setUserIdSpy).toHaveBeenCalledWith('');
  });
});

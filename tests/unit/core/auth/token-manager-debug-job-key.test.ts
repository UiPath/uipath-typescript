import { describe, it, expect, vi } from 'vitest';
import { TokenManager } from '@/core/auth/token-manager';
import { ExecutionContext } from '@/core/context/execution';
import type { Config } from '@/core/config/config';
import { JOB_TEST_CONSTANTS } from '@tests/utils/constants/jobs';

vi.mock('@/utils/platform', () => ({
  isBrowser: true,
  isInActionCenter: true,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

vi.mock('@/core/auth/host-token-request', () => ({
  isTokenExpired: vi.fn(() => false),
  hostEmbeddingOrigin: null,
}));

const captured = vi.hoisted(() => ({ onDebugJobKey: undefined as ((jobKey: string) => void) | undefined }));

vi.mock('@/core/auth/action-center-token-manager', () => ({
  ActionCenterTokenManager: vi.fn().mockImplementation(function (_config: unknown, _onTokenRefreshed: unknown, onDebugJobKey?: (jobKey: string) => void) {
    captured.onDebugJobKey = onDebugJobKey;
    return { refreshAccessToken: vi.fn() };
  }),
}));

const CONFIG: Config = {
  baseUrl: 'https://cloud.uipath.com',
  orgName: 'test-org',
  tenantName: 'test-tenant',
  clientId: 'ac-client',
  scope: 'openid',
};

describe('TokenManager debug job key from the Action Center host', () => {
  it('hands the key the Action Center manager reports to every listener', () => {
    const manager = new TokenManager(new ExecutionContext(), CONFIG);
    const first = vi.fn();
    const second = vi.fn();
    manager.onDebugJobKey(first);
    manager.onDebugJobKey(second);

    captured.onDebugJobKey?.(JOB_TEST_CONSTANTS.JOB_KEY);

    expect(first).toHaveBeenCalledWith(JOB_TEST_CONSTANTS.JOB_KEY);
    expect(second).toHaveBeenCalledWith(JOB_TEST_CONSTANTS.JOB_KEY);
  });
});

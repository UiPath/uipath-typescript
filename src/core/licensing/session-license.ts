import type { UiPathConfig } from '../config/config';
import type { ExecutionContext } from '../context/execution';
import type { TokenManager } from '../auth/token-manager';
import type { RetryOptions } from '../../models/common/http.types';
import { ApiClient } from '../http/api-client';
import { AUTH_STORAGE_KEYS } from '../auth/constants';
import { STUDIO_WEB_LICENSE_ENDPOINTS } from '../../utils/constants/endpoints';
import { extractUserIdFromToken } from '../../utils/encoding/jwt';
import { SessionStore } from '../../utils/storage/session-store';
import { MemoryStore } from '../../utils/storage/memory-store';
import type { KeyValueStore } from '../../utils/storage/key-value-store';

/** AcquireLicense is idempotent, so the POST is safe to repeat. */
const ACQUIRE_RETRY: RetryOptions = { maxRetries: 2, initialDelayMs: 1000, retryMethods: ['POST'] };

export function acquireLicenseOnSignIn(config: UiPathConfig, context: ExecutionContext, tokenManager: TokenManager): void {
  const apiClient = new ApiClient(config, context, tokenManager);
  const claimKey = `${AUTH_STORAGE_KEYS.LICENSE_PREFIX}${config.baseUrl}/${config.orgName}/${config.tenantName}`;
  const claims: KeyValueStore = SessionStore.open() ?? new MemoryStore();
  let currentUserId: string | undefined;

  const release = (userId: string): void => {
    if (claims.read<string>(claimKey) === userId) claims.remove(claimKey);
  };

  const acquire = (userId: string): void => {
    // Claimed before the request starts, so other SDK instances on the page skip it.
    claims.write(claimKey, userId);
    apiClient
      .post(STUDIO_WEB_LICENSE_ENDPOINTS.ACQUIRE, undefined, { retry: ACQUIRE_RETRY })
      .catch((error: unknown) => {
        release(userId);
        console.warn('[UiPath SDK] Could not acquire a Studio Web license for the signed-in user', error);
      });
  };

  tokenManager.onTokenChange((tokenInfo) => {
    const userId = (tokenInfo && extractUserIdFromToken(tokenInfo.token)) || undefined;
    if (userId !== currentUserId) {
      if (currentUserId) release(currentUserId);
      currentUserId = userId;
    }
    if (userId && claims.read<string>(claimKey) !== userId) acquire(userId);
  });
}

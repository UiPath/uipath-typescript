import type { UiPathConfig } from '../config/config';
import type { ExecutionContext } from '../context/execution';
import type { TokenManager } from '../auth/token-manager';
import type { TokenInfo } from '../auth/types';
import type { RetryOptions } from '../../models/common/http.types';
import { ApiClient } from '../http/api-client';
import { AUTH_STORAGE_KEYS } from '../auth/constants';
import { STUDIO_WEB_LICENSE_ENDPOINTS } from '../../utils/constants/endpoints';
import { extractUserIdFromToken } from '../../utils/encoding/jwt';
import { sessionStore } from '../../utils/storage/session-store';

/** AcquireLicense is idempotent, so the POST is safe to repeat. */
const ACQUIRE_RETRY: RetryOptions = { maxRetries: 2, initialDelayMs: 1000, retryMethods: ['POST'] };

export class SessionLicense {
  readonly #apiClient: ApiClient;
  readonly #claimKey: string;
  #userId?: string;

  constructor(config: UiPathConfig, context: ExecutionContext, tokenManager: TokenManager) {
    this.#apiClient = new ApiClient(config, context, tokenManager);
    this.#claimKey = `${AUTH_STORAGE_KEYS.LICENSE_PREFIX}${config.baseUrl}/${config.orgName}/${config.tenantName}`;
    tokenManager.onTokenChange((tokenInfo) => this.#onTokenChange(tokenInfo));
    this.#onTokenChange(tokenManager.getTokenInfo());
  }

  #onTokenChange(tokenInfo: TokenInfo | undefined): void {
    const userId = (tokenInfo && extractUserIdFromToken(tokenInfo.token)) || undefined;
    if (userId === this.#userId) return;

    if (this.#userId) this.#release(this.#userId);
    this.#userId = userId;
    if (userId && sessionStore.read<string>(this.#claimKey) !== userId) this.#acquire(userId);
  }

  #acquire(userId: string): void {
    // Claimed before the request starts, so other SDK instances on the page skip it.
    sessionStore.write(this.#claimKey, userId);
    this.#apiClient
      .post(STUDIO_WEB_LICENSE_ENDPOINTS.ACQUIRE, undefined, { retry: ACQUIRE_RETRY })
      .catch((error: unknown) => {
        this.#release(userId);
        console.warn('[UiPath SDK] Could not acquire a Studio Web license for the signed-in user', error);
      });
  }

  #release(userId: string): void {
    if (sessionStore.read<string>(this.#claimKey) === userId) sessionStore.remove(this.#claimKey);
  }
}

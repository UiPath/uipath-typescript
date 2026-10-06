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

/**
 * Acquires a Studio Web license once per sign-in of an interactive user, which
 * provisions the personal robot that user's jobs run on. Never blocks the
 * sign-in or any call; a failed acquisition is logged and left to the server
 * to answer for.
 *
 * The session store holds one claim per tenant — the user it was acquired for —
 * written before the request starts, so every SDK instance on the page sees it
 * and the acquisition runs once. A token refresh keeps the claim, a different
 * user replaces it, a logout or a failed acquisition removes it.
 *
 * @internal
 */
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

import type { UiPathConfig } from '../config/config';
import type { TokenInfo } from '../auth/types';
import type { ApiClient } from '../http/api-client';
import type { RetryOptions } from '../../models/common/http.types';
import { AUTH_STORAGE_KEYS } from '../auth/constants';
import { STUDIO_WEB_LICENSE_ENDPOINTS } from '../../utils/constants/endpoints';
import { extractUserIdFromToken } from '../../utils/encoding/jwt';
import type { KeyValueStore } from '../../utils/storage/key-value-store';

/** AcquireLicense is idempotent, so the POST is safe to repeat. */
const ACQUIRE_RETRY: RetryOptions = { maxRetries: 2, initialDelayMs: 1000, retryMethods: ['POST'] };
const ACQUIRE_TIMEOUT_MS = 3_000;

export class SessionLicense {
  readonly #apiClient: ApiClient;
  readonly #claims: KeyValueStore;
  readonly #claimKey: string;
  #userId?: string;
  #acquisition: Promise<void> = Promise.resolve();

  constructor(config: UiPathConfig, apiClient: ApiClient, claims: KeyValueStore) {
    this.#apiClient = apiClient;
    this.#claims = claims;
    this.#claimKey = `${AUTH_STORAGE_KEYS.LICENSE_PREFIX}${config.baseUrl}/${config.orgName}/${config.tenantName}`;
  }

  onTokenChange(tokenInfo: TokenInfo | undefined): void {
    const userId = (tokenInfo && extractUserIdFromToken(tokenInfo.token)) || undefined;
    if (userId !== this.#userId) {
      if (this.#userId) this.#release(this.#userId);
      this.#userId = userId;
    }
    if (userId && this.#claims.read<string>(this.#claimKey) !== userId) this.#acquire(userId);
  }

  settled(): Promise<void> {
    return this.#acquisition;
  }

  #acquire(userId: string): void {
    // Claimed before the request starts, so other SDK instances on the page skip it.
    // Kept until sign-out even when the request fails: a failure is not retried.
    this.#claims.write(this.#claimKey, userId);
    this.#acquisition = this.#apiClient
      .post(STUDIO_WEB_LICENSE_ENDPOINTS.ACQUIRE, undefined, { retry: ACQUIRE_RETRY, timeoutMs: ACQUIRE_TIMEOUT_MS })
      .then(
        () => undefined,
        (error: unknown) => {
          console.warn('[UiPath SDK] Could not provision a personal robot for the signed-in user', error);
        },
      );
  }

  #release(userId: string): void {
    if (this.#claims.read<string>(this.#claimKey) === userId) this.#claims.remove(this.#claimKey);
  }
}

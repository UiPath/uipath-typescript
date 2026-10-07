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

export class SessionLicense {
  readonly #apiClient: ApiClient;
  readonly #claims: KeyValueStore;
  readonly #claimKey: string;
  #userId?: string;

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

  #acquire(userId: string): void {
    // Claimed before the request starts, so other SDK instances on the page skip it.
    this.#claims.write(this.#claimKey, userId);
    this.#apiClient
      .post(STUDIO_WEB_LICENSE_ENDPOINTS.ACQUIRE, undefined, { retry: ACQUIRE_RETRY })
      .catch((error: unknown) => {
        this.#release(userId);
        console.warn('[UiPath SDK] Could not acquire a Studio Web license for the signed-in user', error);
      });
  }

  #release(userId: string): void {
    if (this.#claims.read<string>(this.#claimKey) === userId) this.#claims.remove(this.#claimKey);
  }
}

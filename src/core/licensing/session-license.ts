import type { UiPathConfig } from '../config/config';
import type { ExecutionContext } from '../context/execution';
import type { TokenManager } from '../auth/token-manager';
import type { TokenInfo } from '../auth/types';
import type { RetryOptions } from '../../models/common/http.types';
import { ApiClient } from '../http/api-client';
import { AUTH_STORAGE_KEYS } from '../auth/constants';
import { STUDIO_WEB_LICENSE_ENDPOINTS } from '../../utils/constants/endpoints';
import { decodeJwtClaims, extractUserIdFromToken } from '../../utils/encoding/jwt';
import { readSessionJson, removeSession, writeSessionJson } from '../../utils/storage/session-storage';
import type { RawStudioWebLicenseResponse, StudioWebLicense, StudioWebLicenseTokenClaims } from './types';

const ACQUISITIONS_KEY = Symbol.for('@uipath/sdk-license-acquisitions');

/** AcquireLicense is idempotent, so the POST is safe to repeat. */
const ACQUIRE_RETRY: RetryOptions = { maxRetries: 2, initialDelayMs: 1000, retryMethods: ['POST'] };

function acquisitions(): Map<string, Promise<StudioWebLicense>> {
  const store = globalThis as typeof globalThis & Record<symbol, Map<string, Promise<StudioWebLicense>> | undefined>;
  return (store[ACQUISITIONS_KEY] ??= new Map<string, Promise<StudioWebLicense>>());
}

/**
 * Empties the in-memory acquisitions shared by every SDK instance.
 *
 * @internal
 */
export function clearSessionLicenses(): void {
  acquisitions().clear();
}

function storageKey(identity: string): string {
  return `${AUTH_STORAGE_KEYS.LICENSE_PREFIX}${identity}`;
}

function forget(identity: string): void {
  acquisitions().delete(identity);
  removeSession(storageKey(identity));
}

/**
 * Maps the raw acquisition response to the SDK shape, folding in the token's
 * claims. A token the SDK cannot read costs only the derived fields.
 *
 * @internal
 */
export function toStudioWebLicense(raw: RawStudioWebLicenseResponse): StudioWebLicense {
  const claims = decodeJwtClaims<StudioWebLicenseTokenClaims>(raw.licenseToken);

  return {
    robotType: raw.robotType,
    robotTypes: raw.robotTypes,
    isLicensed: raw.isLicensed,
    startedTime: raw.started,
    expiresTime: claims?.exp ? new Date(claims.exp * 1000).toISOString() : undefined,
    licenseTier: claims?.ubl,
    licensedUnits: claims?.lu,
  };
}

/**
 * Acquires a Studio Web license once per sign-in of an interactive app user,
 * which provisions the personal robot that user's jobs run on. Never blocks
 * the sign-in or any call; a failed acquisition is logged and left to the
 * server to answer for.
 *
 * A sign-in is a tenant plus the token's `sub`: token refreshes keep it, a
 * different user or a logout ends it.
 *
 * @internal
 */
export class SessionLicense {
  readonly #apiClient: ApiClient;
  readonly #tenantScope: string;
  #identity?: string;

  constructor(config: UiPathConfig, context: ExecutionContext, tokenManager: TokenManager) {
    this.#apiClient = new ApiClient(config, context, tokenManager);
    this.#tenantScope = `${config.baseUrl}/${config.orgName}/${config.tenantName}`;
    tokenManager.onTokenChange((tokenInfo) => this.#onTokenChange(tokenInfo));
    this.#onTokenChange(tokenManager.getTokenInfo());
  }

  #onTokenChange(tokenInfo: TokenInfo | undefined): void {
    const identity = tokenInfo ? this.#identityOf(tokenInfo.token) : undefined;
    if (identity === this.#identity) return;

    if (this.#identity) forget(this.#identity);
    this.#identity = identity;
    if (identity) {
      this.#ensure(identity).catch((error: unknown) => {
        console.warn('[UiPath SDK] Could not acquire a Studio Web license for the signed-in user', error);
      });
    }
  }

  #identityOf(token: string): string | undefined {
    const userId = extractUserIdFromToken(token);
    return userId ? `${this.#tenantScope}:${userId}` : undefined;
  }

  async #ensure(identity: string): Promise<StudioWebLicense> {
    const store = acquisitions();
    const pending = store.get(identity);
    if (pending) return pending;
    const held = readSessionJson<StudioWebLicense>(storageKey(identity));
    if (held) return held;

    const acquisition = this.#apiClient
      .post<RawStudioWebLicenseResponse>(STUDIO_WEB_LICENSE_ENDPOINTS.ACQUIRE, undefined, { retry: ACQUIRE_RETRY })
      .then(toStudioWebLicense);
    store.set(identity, acquisition);

    try {
      const license = await acquisition;
      writeSessionJson(storageKey(identity), license);
      return license;
    } catch (error) {
      if (store.get(identity) === acquisition) store.delete(identity);
      throw error;
    }
  }
}

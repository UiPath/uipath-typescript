import { isBrowser } from '../platform';

/**
 * Values kept for the length of the user's browser session.
 *
 * The store is not guaranteed to exist — there is none outside a browser, and a
 * browser can deny it or refuse a write. A read then comes back `undefined` and
 * a write returns `false`; no call ever throws.
 */
export class SessionStore {
  readonly #storage: Storage | undefined;

  constructor() {
    this.#storage = SessionStore.#resolve();
  }

  read<T>(key: string): T | undefined {
    try {
      const stored = this.#storage?.getItem(key);
      return stored ? ((JSON.parse(stored) as T | null) ?? undefined) : undefined;
    } catch (error) {
      console.warn(`[UiPath SDK] Could not read ${key} from the session store`, error);
      return undefined;
    }
  }

  write(key: string, value: unknown): boolean {
    if (!this.#storage) return false;
    try {
      this.#storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`[UiPath SDK] Could not write ${key} to the session store`, error);
      return false;
    }
  }

  remove(key: string): void {
    try {
      this.#storage?.removeItem(key);
    } catch (error) {
      console.warn(`[UiPath SDK] Could not remove ${key} from the session store`, error);
    }
  }

  static #resolve(): Storage | undefined {
    if (!isBrowser) return undefined;
    try {
      return globalThis.sessionStorage;
    } catch (error) {
      console.warn('[UiPath SDK] The session store is unavailable', error);
      return undefined;
    }
  }
}

export const sessionStore = new SessionStore();

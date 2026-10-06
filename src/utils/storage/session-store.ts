import { isBrowser } from '../platform';
import type { KeyValueStore } from './key-value-store';

/**
 * Values kept for the length of the user's browser session.
 *
 * There is none outside a browser, and a browser can deny it, so `open()` and
 * the shared `sessionStore` are `undefined` there. A browser can still refuse a
 * read or a write; the read then comes back `undefined` and the write returns
 * `false`. No call ever throws.
 */
export class SessionStore implements KeyValueStore {
  readonly #storage: Storage;

  constructor(storage: Storage) {
    this.#storage = storage;
  }

  static open(): SessionStore | undefined {
    const storage = SessionStore.#resolve();
    return storage ? new SessionStore(storage) : undefined;
  }

  read<T>(key: string): T | undefined {
    try {
      const stored = this.#storage.getItem(key);
      return stored ? ((JSON.parse(stored) as T | null) ?? undefined) : undefined;
    } catch (error) {
      console.warn(`[UiPath SDK] Could not read ${key} from the session store`, error);
      return undefined;
    }
  }

  write(key: string, value: unknown): boolean {
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
      this.#storage.removeItem(key);
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

export const sessionStore = SessionStore.open();

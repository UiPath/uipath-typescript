import { isBrowser } from '@/utils/platform';
import type { KeyValueStore } from './key-value-store';

/** The storage areas a browser offers. */
export type WebStorageArea = 'sessionStorage' | 'localStorage';

/**
 * A browser storage area as a `KeyValueStore`.
 *
 * There is none outside a browser, and a browser can deny it, so `resolve()` is
 * `undefined` there. A browser can still refuse a read or a write; the read
 * then comes back `undefined` and the write returns `false`. No call ever
 * throws.
 */
export class WebStore implements KeyValueStore {
  readonly #storage: Storage;
  readonly #name: string;

  /**
   * @param storage - The storage area to keep values in
   * @param name - What to call the store in a warning, such as "session store"
   */
  protected constructor(storage: Storage, name: string) {
    this.#storage = storage;
    this.#name = name;
  }

  read<T>(key: string): T | undefined {
    try {
      const stored = this.#storage.getItem(key);
      return stored ? ((JSON.parse(stored) as T | null) ?? undefined) : undefined;
    } catch (error) {
      console.warn(`[UiPath SDK] Could not read ${key} from the ${this.#name}`, error);
      return undefined;
    }
  }

  write(key: string, value: unknown): boolean {
    try {
      this.#storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`[UiPath SDK] Could not write ${key} to the ${this.#name}`, error);
      return false;
    }
  }

  remove(key: string): void {
    try {
      this.#storage.removeItem(key);
    } catch (error) {
      console.warn(`[UiPath SDK] Could not remove ${key} from the ${this.#name}`, error);
    }
  }

  protected static resolve(area: WebStorageArea, name: string): Storage | undefined {
    if (!isBrowser) return undefined;
    try {
      return globalThis[area];
    } catch (error) {
      console.warn(`[UiPath SDK] The ${name} is unavailable`, error);
      return undefined;
    }
  }
}

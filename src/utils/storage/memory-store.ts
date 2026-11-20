import type { KeyValueStore } from './key-value-store';

export class MemoryStore implements KeyValueStore {
  readonly #entries = new Map<string, unknown>();

  read<T>(key: string): T | undefined {
    return this.#entries.get(key) as T | undefined;
  }

  write(key: string, value: unknown): boolean {
    this.#entries.set(key, value);
    return true;
  }

  remove(key: string): void {
    this.#entries.delete(key);
  }
}

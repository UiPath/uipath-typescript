import { vi } from 'vitest';

/**
 * In-memory `sessionStorage`, installed when this module is imported.
 *
 * The SDK's shared session store looks up `sessionStorage` once, when it is
 * first imported, so a suite that needs storage must import this module before
 * any SDK module and call `reset()` between tests.
 */
function createMemorySessionStorage() {
  const entries = new Map<string, string>();
  const storage = {
    entries,
    getItem: vi.fn((key: string) => entries.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { entries.set(key, value); }),
    removeItem: vi.fn((key: string) => { entries.delete(key); }),
    reset(): void {
      entries.clear();
      storage.getItem.mockClear();
      storage.setItem.mockClear();
      storage.removeItem.mockClear();
    },
  };
  return storage;
}

export const memorySessionStorage = createMemorySessionStorage();

Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: memorySessionStorage,
});

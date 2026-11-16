import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalStore } from '@/utils/storage/local-store';
import { TEST_CONSTANTS } from '@tests/utils/constants/common';

const { mockPlatform } = vi.hoisted(() => ({ mockPlatform: { isBrowser: true } }));
vi.mock('@/utils/platform', () => mockPlatform);

const KEY = 'uipath_sdk_test';
const RECORD = { token: 'stored-value', count: 2 };

function stubStorage(overrides: Partial<Storage> = {}): Map<string, string> {
  const entries = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
    removeItem: (key: string) => { entries.delete(key); },
    ...overrides,
  });
  return entries;
}

function openStore(): LocalStore {
  const store = LocalStore.open();
  if (!store) throw new Error('Expected the local store to open');
  return store;
}

const failing = () => {
  throw new Error(TEST_CONSTANTS.ERROR_MESSAGE);
};

describe('LocalStore', () => {
  let warn!: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    mockPlatform.isBrowser = true;
    Reflect.deleteProperty(globalThis, 'localStorage');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should keep its values in local storage, not session storage', () => {
    const entries = stubStorage();
    const sessionSetItem = vi.fn();
    vi.stubGlobal('sessionStorage', { setItem: sessionSetItem });

    expect(openStore().write(KEY, RECORD)).toBe(true);

    expect(JSON.parse(entries.get(KEY) ?? 'null')).toEqual(RECORD);
    expect(sessionSetItem).not.toHaveBeenCalled();
  });

  it('should round-trip an object and remove it', () => {
    const entries = stubStorage();
    const store = openStore();

    store.write(KEY, RECORD);
    expect(store.read(KEY)).toEqual(RECORD);

    store.remove(KEY);
    expect(entries.has(KEY)).toBe(false);
  });

  it('should not open, and not warn, when the runtime has no local storage', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(LocalStore.open()).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });

  it('should not open outside a browser, even when the runtime provides local storage', () => {
    stubStorage();
    mockPlatform.isBrowser = false;

    expect(LocalStore.open()).toBeUndefined();
  });

  it('should not open, and should warn, when the browser denies local storage', () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: failing });

    expect(LocalStore.open()).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('should report a failed write and name the local store in the warning', () => {
    stubStorage({ setItem: failing });

    expect(openStore().write(KEY, RECORD)).toBe(false);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('local store');
  });
});

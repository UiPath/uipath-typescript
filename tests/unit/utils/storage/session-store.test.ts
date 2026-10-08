import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionStore } from '../../../../src/utils/storage/session-store';
import { TEST_CONSTANTS } from '../../../utils/constants/common';

const { mockPlatform } = vi.hoisted(() => ({ mockPlatform: { isBrowser: true } }));
vi.mock('../../../../src/utils/platform', () => mockPlatform);

const KEY = 'uipath_sdk_test';
const TEXT = 'stored-value';
const RECORD = { token: TEXT, count: 2 };

function stubStorage(overrides: Partial<Storage> = {}): Map<string, string> {
  const entries = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
    removeItem: (key: string) => { entries.delete(key); },
    ...overrides,
  });
  return entries;
}

function openStore(): SessionStore {
  const store = SessionStore.open();
  if (!store) throw new Error('Expected the session store to open');
  return store;
}

const failing = () => {
  throw new Error(TEST_CONSTANTS.ERROR_MESSAGE);
};

describe('SessionStore', () => {
  let warn!: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    mockPlatform.isBrowser = true;
    Reflect.deleteProperty(globalThis, 'sessionStorage');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('when the store exists', () => {
    it('should round-trip a string', () => {
      stubStorage();
      const store = openStore();

      expect(store.write(KEY, TEXT)).toBe(true);
      expect(store.read<string>(KEY)).toBe(TEXT);
    });

    it('should round-trip an object', () => {
      stubStorage();
      const store = openStore();

      expect(store.write(KEY, RECORD)).toBe(true);
      expect(store.read(KEY)).toEqual(RECORD);
    });

    it('should return undefined for a missing key', () => {
      stubStorage();

      expect(openStore().read(KEY)).toBeUndefined();
    });

    it('should remove a value', () => {
      const entries = stubStorage();
      const store = openStore();
      store.write(KEY, TEXT);

      store.remove(KEY);

      expect(entries.has(KEY)).toBe(false);
    });

    it('should return undefined and warn for a value it cannot read back', () => {
      const entries = stubStorage();
      entries.set(KEY, TEXT);

      expect(openStore().read(KEY)).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('should return undefined for a stored null', () => {
      stubStorage();
      const store = openStore();
      store.write(KEY, null);

      expect(store.read(KEY)).toBeUndefined();
    });
  });

  describe('when it cannot open', () => {
    it('should not open, and not warn, when the runtime has no session storage', () => {
      vi.stubGlobal('sessionStorage', undefined);

      expect(SessionStore.open()).toBeUndefined();
      expect(warn).not.toHaveBeenCalled();
    });

    it('should not open outside a browser, even when the runtime provides session storage', () => {
      stubStorage();
      mockPlatform.isBrowser = false;

      expect(SessionStore.open()).toBeUndefined();
    });

    it('should not open, and should warn, when the browser denies session storage', () => {
      Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get: failing });

      expect(SessionStore.open()).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('when a call fails', () => {
    it('should report a failed write and warn', () => {
      stubStorage({ setItem: failing });

      expect(openStore().write(KEY, TEXT)).toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('should return undefined and warn when a read fails', () => {
      stubStorage({ getItem: failing });

      expect(openStore().read(KEY)).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('should warn instead of throwing when a removal fails', () => {
      stubStorage({ removeItem: failing });

      expect(() => openStore().remove(KEY)).not.toThrow();
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionStore } from '../../../../src/utils/storage/session-store';
import { TEST_CONSTANTS } from '../../../utils/constants/common';

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

const failing = () => {
  throw new Error(TEST_CONSTANTS.ERROR_MESSAGE);
};

describe('SessionStore', () => {
  let warn!: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('when the store exists', () => {
    it('should round-trip a string', () => {
      stubStorage();
      const store = new SessionStore();

      expect(store.write(KEY, TEXT)).toBe(true);
      expect(store.read<string>(KEY)).toBe(TEXT);
    });

    it('should round-trip an object', () => {
      stubStorage();
      const store = new SessionStore();

      expect(store.write(KEY, RECORD)).toBe(true);
      expect(store.read(KEY)).toEqual(RECORD);
    });

    it('should return undefined for a missing key', () => {
      stubStorage();

      expect(new SessionStore().read(KEY)).toBeUndefined();
    });

    it('should remove a value', () => {
      const entries = stubStorage();
      const store = new SessionStore();
      store.write(KEY, TEXT);

      store.remove(KEY);

      expect(entries.has(KEY)).toBe(false);
    });

    it('should return undefined and warn for a value it cannot read back', () => {
      const entries = stubStorage();
      entries.set(KEY, TEXT);

      expect(new SessionStore().read(KEY)).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('should return undefined for a stored null', () => {
      stubStorage();
      const store = new SessionStore();
      store.write(KEY, null);

      expect(store.read(KEY)).toBeUndefined();
    });
  });

  describe('when the store does not exist', () => {
    beforeEach(() => {
      vi.stubGlobal('sessionStorage', undefined);
    });

    it('should read undefined, report a dropped write, and not warn', () => {
      const store = new SessionStore();

      expect(store.read(KEY)).toBeUndefined();
      expect(store.write(KEY, RECORD)).toBe(false);
      expect(() => store.remove(KEY)).not.toThrow();

      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('when the browser denies the store', () => {
    beforeEach(() => {
      Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get: failing });
    });

    afterEach(() => {
      Reflect.deleteProperty(globalThis, 'sessionStorage');
    });

    it('should read undefined, report a dropped write, and warn instead of throwing', () => {
      const store = new SessionStore();

      expect(store.read(KEY)).toBeUndefined();
      expect(store.write(KEY, TEXT)).toBe(false);
      expect(() => store.remove(KEY)).not.toThrow();

      expect(warn).toHaveBeenCalled();
    });
  });

  describe('when a call fails', () => {
    it('should report a failed write and warn', () => {
      stubStorage({ setItem: failing });

      expect(new SessionStore().write(KEY, TEXT)).toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('should return undefined and warn when a read fails', () => {
      stubStorage({ getItem: failing });

      expect(new SessionStore().read(KEY)).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('should warn instead of throwing when a removal fails', () => {
      stubStorage({ removeItem: failing });

      expect(() => new SessionStore().remove(KEY)).not.toThrow();
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });
});

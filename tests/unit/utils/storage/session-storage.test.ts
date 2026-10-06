import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  readSession,
  readSessionJson,
  removeSession,
  writeSession,
  writeSessionJson,
} from '../../../../src/utils/storage/session-storage';
import { TEST_CONSTANTS } from '../../../utils/constants/common';

const KEY = 'uipath_sdk_test';
const VALUE = 'stored-value';
const RECORD = { token: VALUE, count: 2 };

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

describe('session storage', () => {
  let warn!: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('when storage exists', () => {
    it('should round-trip a string', () => {
      stubStorage();

      expect(writeSession(KEY, VALUE)).toBe(true);
      expect(readSession(KEY)).toBe(VALUE);
    });

    it('should round-trip a JSON value', () => {
      stubStorage();

      expect(writeSessionJson(KEY, RECORD)).toBe(true);
      expect(readSessionJson(KEY)).toEqual(RECORD);
    });

    it('should return undefined for a missing key', () => {
      stubStorage();

      expect(readSession(KEY)).toBeUndefined();
      expect(readSessionJson(KEY)).toBeUndefined();
    });

    it('should remove a value', () => {
      const entries = stubStorage();
      writeSession(KEY, VALUE);

      removeSession(KEY);

      expect(entries.has(KEY)).toBe(false);
    });

    it('should return undefined and warn for a value that is not JSON', () => {
      stubStorage();
      writeSession(KEY, VALUE);

      expect(readSessionJson(KEY)).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('should return undefined for a stored JSON null', () => {
      stubStorage();
      writeSession(KEY, 'null');

      expect(readSessionJson(KEY)).toBeUndefined();
    });
  });

  describe('when storage does not exist', () => {
    beforeEach(() => {
      vi.stubGlobal('sessionStorage', undefined);
    });

    it('should read undefined, report a dropped write, and not warn', () => {
      expect(readSession(KEY)).toBeUndefined();
      expect(readSessionJson(KEY)).toBeUndefined();
      expect(writeSession(KEY, VALUE)).toBe(false);
      expect(writeSessionJson(KEY, RECORD)).toBe(false);
      expect(() => removeSession(KEY)).not.toThrow();

      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('when the browser denies storage', () => {
    beforeEach(() => {
      Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get: failing });
    });

    afterEach(() => {
      Reflect.deleteProperty(globalThis, 'sessionStorage');
    });

    it('should read undefined, report a dropped write, and warn instead of throwing', () => {
      expect(readSession(KEY)).toBeUndefined();
      expect(writeSession(KEY, VALUE)).toBe(false);
      expect(() => removeSession(KEY)).not.toThrow();

      expect(warn).toHaveBeenCalled();
    });
  });

  describe('when a storage call fails', () => {
    it('should report a failed write and warn', () => {
      stubStorage({ setItem: failing });

      expect(writeSession(KEY, VALUE)).toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('should return undefined and warn when a read fails', () => {
      stubStorage({ getItem: failing });

      expect(readSession(KEY)).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('should warn instead of throwing when a removal fails', () => {
      stubStorage({ removeItem: failing });

      expect(() => removeSession(KEY)).not.toThrow();
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });
});

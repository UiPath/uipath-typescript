import { describe, it, expect } from 'vitest';
import { NO_OP_STORE } from '../../../../src/utils/storage/no-op-store';

const KEY = 'uipath_sdk_test';
const VALUE = { token: 'stored-value', count: 2 };

describe('NO_OP_STORE', () => {
  it('should report a write as not kept', () => {
    expect(NO_OP_STORE.write(KEY, VALUE)).toBe(false);
  });

  it('should read nothing back after a write', () => {
    NO_OP_STORE.write(KEY, VALUE);

    expect(NO_OP_STORE.read(KEY)).toBeUndefined();
  });

  it('should remove without throwing', () => {
    expect(() => NO_OP_STORE.remove(KEY)).not.toThrow();
  });
});

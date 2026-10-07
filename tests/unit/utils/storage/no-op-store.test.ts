import { describe, it, expect } from 'vitest';
import { NoOpStore } from '../../../../src/utils/storage/no-op-store';

const KEY = 'uipath_sdk_test';
const VALUE = { token: 'stored-value', count: 2 };

describe('NoOpStore', () => {
  it('should report a write as not kept', () => {
    expect(new NoOpStore().write(KEY, VALUE)).toBe(false);
  });

  it('should read nothing back after a write', () => {
    const store = new NoOpStore();
    store.write(KEY, VALUE);

    expect(store.read(KEY)).toBeUndefined();
  });

  it('should remove without throwing', () => {
    expect(() => new NoOpStore().remove(KEY)).not.toThrow();
  });
});

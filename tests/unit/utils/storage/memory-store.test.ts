import { describe, it, expect } from 'vitest';
import { MemoryStore } from '../../../../src/utils/storage/memory-store';

const KEY = 'uipath_sdk_test';
const VALUE = { token: 'stored-value', count: 2 };

describe('MemoryStore', () => {
  it('should round-trip a value', () => {
    const store = new MemoryStore();

    expect(store.write(KEY, VALUE)).toBe(true);
    expect(store.read(KEY)).toEqual(VALUE);
  });

  it('should return undefined for a missing key', () => {
    expect(new MemoryStore().read(KEY)).toBeUndefined();
  });

  it('should remove a value', () => {
    const store = new MemoryStore();
    store.write(KEY, VALUE);

    store.remove(KEY);

    expect(store.read(KEY)).toBeUndefined();
  });

  it('should keep values separate per instance', () => {
    const first = new MemoryStore();
    first.write(KEY, VALUE);

    expect(new MemoryStore().read(KEY)).toBeUndefined();
  });
});

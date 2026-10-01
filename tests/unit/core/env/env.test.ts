import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/utils/platform', () => ({ isBrowser: true }));

import { env, resetEnvCache, UIPATH_ENV_GLOBAL } from '@/core/env';

function setGlobal(value: unknown): void {
  (globalThis as Record<string, unknown>)[UIPATH_ENV_GLOBAL] = value;
}

beforeEach(() => {
  resetEnvCache();
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>)[UIPATH_ENV_GLOBAL];
  resetEnvCache();
});

describe('env', () => {
  it('reads a variable by property access', () => {
    setGlobal({ UIPATH_PUBLIC_REGION: 'EU' });
    expect(env.UIPATH_PUBLIC_REGION).toBe('EU');
  });

  it('reads the same value through get()', () => {
    setGlobal({ UIPATH_PUBLIC_REGION: 'EU' });
    expect(env.get('UIPATH_PUBLIC_REGION')).toBe('EU');
  });

  it('returns undefined for an unset name, so ?? supplies the fallback', () => {
    setGlobal({});
    expect(env.UIPATH_PUBLIC_REGION).toBeUndefined();
    expect(env.UIPATH_PUBLIC_REGION ?? 'EU').toBe('EU');
    expect(env.get('UIPATH_PUBLIC_REGION')).toBeUndefined();
  });

  it('is empty and does not throw when the global is absent', () => {
    expect(env.UIPATH_PUBLIC_REGION).toBeUndefined();
    expect(Object.keys(env)).toEqual([]);
  });

  it('is empty when the global is not an object', () => {
    setGlobal('not an object');
    expect(Object.keys(env)).toEqual([]);
    setGlobal(['a']);
    resetEnvCache();
    expect(Object.keys(env)).toEqual([]);
  });

  it('keeps string values only', () => {
    setGlobal({ UIPATH_PUBLIC_A: 'x', UIPATH_PUBLIC_B: 1, UIPATH_PUBLIC_C: null });
    expect(Object.keys(env)).toEqual(['UIPATH_PUBLIC_A']);
    expect(env.UIPATH_PUBLIC_B).toBeUndefined();
  });

  it('enumerates every published variable', () => {
    setGlobal({ UIPATH_PUBLIC_A: 'x', UIPATH_PUBLIC_B: 'y' });
    expect(Object.entries(env)).toEqual([
      ['UIPATH_PUBLIC_A', 'x'],
      ['UIPATH_PUBLIC_B', 'y'],
    ]);
    expect('UIPATH_PUBLIC_A' in env).toBe(true);
    expect('UIPATH_PUBLIC_Z' in env).toBe(false);
  });

  it('reads the global once and keeps that table', () => {
    setGlobal({ UIPATH_PUBLIC_A: 'first' });
    expect(env.UIPATH_PUBLIC_A).toBe('first');
    setGlobal({ UIPATH_PUBLIC_A: 'second' });
    expect(env.UIPATH_PUBLIC_A).toBe('first');
  });

  it('is read-only', () => {
    setGlobal({ UIPATH_PUBLIC_A: 'x' });
    expect(() => {
      (env as Record<string, unknown>).UIPATH_PUBLIC_A = 'y';
    }).toThrow();
    expect(env.UIPATH_PUBLIC_A).toBe('x');
  });
});

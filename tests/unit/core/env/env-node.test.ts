import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('@/utils/platform', () => ({ isBrowser: false }));

import { env, resetEnvCache, UIPATH_ENV_GLOBAL } from '@/core/env';

afterEach(() => {
  delete (globalThis as Record<string, unknown>)[UIPATH_ENV_GLOBAL];
  resetEnvCache();
});

describe('env outside a browser', () => {
  it('ignores the global and stays empty', () => {
    (globalThis as Record<string, unknown>)[UIPATH_ENV_GLOBAL] = { UIPATH_PUBLIC_A: 'x' };
    expect(env.UIPATH_PUBLIC_A).toBeUndefined();
    expect(Object.keys(env)).toEqual([]);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// The browser branch of loadFromEnvironment: meta tags are the browser's
// configuration source, so the environment contract must never be consulted.
vi.mock('@/utils/platform', () => ({ isBrowser: true }));

import { loadFromEnvironment } from '@/core/config/environment';
import { clearContractEnv } from '../../../utils/env-contract';

let restoreEnv: () => void;

beforeEach(() => {
  restoreEnv = clearContractEnv();
});

afterEach(() => {
  restoreEnv();
});

describe('loadFromEnvironment in the browser', () => {
  it('returns null even when every contract variable is populated', () => {
    process.env.UIPATH_URL = 'https://alpha.uipath.com';
    process.env.UIPATH_ORGANIZATION_ID = 'org-guid';
    process.env.UIPATH_TENANT_ID = 'tenant-guid';
    process.env.UIPATH_ACCESS_TOKEN = 'token-abc';

    expect(loadFromEnvironment()).toBeNull();
  });
});

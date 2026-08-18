import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// The browser branch of loadFromEnvironment: meta tags are the browser's
// configuration source, so the environment contract must never be consulted.
vi.mock('@/utils/platform', () => ({ isBrowser: true }));

import { loadFromEnvironment } from '@/core/config/environment';

const CONTRACT_VARS = [
  'UIPATH_URL',
  'UIPATH_BASE_URL',
  'UIPATH_ORGANIZATION_ID',
  'UIPATH_ORG_ID',
  'UIPATH_TENANT_ID',
  'UIPATH_TENANT_NAME',
  'UIPATH_ACCESS_TOKEN',
];

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const key of CONTRACT_VARS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
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

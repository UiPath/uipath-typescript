import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must mock platform before importing environment — the loader is a no-op in browsers.
vi.mock('@/utils/platform', () => ({ isBrowser: false }));

import { loadFromEnvironment, readEnv } from '@/core/config/environment';
import { clearContractEnv } from '../../../utils/env-contract';

let restoreEnv: () => void;

beforeEach(() => {
  restoreEnv = clearContractEnv();
});

afterEach(() => {
  restoreEnv();
  vi.unstubAllGlobals();
});

describe('readEnv', () => {
  it('returns the value when the variable is set', () => {
    process.env.UIPATH_BASE_URL = 'https://cloud.uipath.com';
    expect(readEnv('UIPATH_BASE_URL')).toBe('https://cloud.uipath.com');
  });

  it('returns undefined for an unset variable', () => {
    expect(readEnv('UIPATH_BASE_URL')).toBeUndefined();
  });

  it('treats an empty value as absent', () => {
    process.env.UIPATH_BASE_URL = '';
    expect(readEnv('UIPATH_BASE_URL')).toBeUndefined();
  });

  it('falls back to Deno.env when process does not provide the value', () => {
    vi.stubGlobal('Deno', { env: { get: (name: string) => (name === 'UIPATH_BASE_URL' ? 'https://deno.uipath.com' : undefined) } });
    expect(readEnv('UIPATH_BASE_URL')).toBe('https://deno.uipath.com');
  });

  it('returns undefined when a permission-gated process.env throws', () => {
    // Deno's process.env shim proxies the same permission-gated Deno.env, so an
    // unguarded read here would escape the SDK constructor.
    vi.stubGlobal('process', { env: new Proxy({}, { get() { throw new Error('permission denied'); } }) });

    expect(() => readEnv('UIPATH_BASE_URL')).not.toThrow();
    expect(readEnv('UIPATH_BASE_URL')).toBeUndefined();
  });

  it('falls back to Deno.env when process.env throws', () => {
    vi.stubGlobal('process', { env: new Proxy({}, { get() { throw new Error('permission denied'); } }) });
    vi.stubGlobal('Deno', { env: { get: (n: string) => (n === 'UIPATH_BASE_URL' ? 'https://deno.uipath.com' : undefined) } });

    expect(readEnv('UIPATH_BASE_URL')).toBe('https://deno.uipath.com');
  });

  it('returns undefined when Deno throws on a missing env permission', () => {
    vi.stubGlobal('Deno', { env: { get: () => { throw new Error('permission denied'); } } });
    expect(readEnv('UIPATH_BASE_URL')).toBeUndefined();
  });
});

describe('loadFromEnvironment', () => {
  it('returns null when no contract variable is set', () => {
    expect(loadFromEnvironment()).toBeNull();
  });

  it('reads the contract the Functions runtime uses locally', () => {
    process.env.UIPATH_BASE_URL = 'https://cloud.uipath.com';
    process.env.UIPATH_ORG_NAME = 'org-guid';
    process.env.UIPATH_TENANT_NAME = 'tenant-guid';
    process.env.UIPATH_ACCESS_TOKEN = 'token-abc';

    expect(loadFromEnvironment()).toEqual({
      baseUrl: 'https://cloud.uipath.com',
      orgName: 'org-guid',
      tenantName: 'tenant-guid',
      secret: 'token-abc',
    });
  });

  it('returns a partial config when only some variables are set', () => {
    process.env.UIPATH_BASE_URL = 'https://alpha.uipath.com';
    const config = loadFromEnvironment();
    expect(config?.baseUrl).toBe('https://alpha.uipath.com');
    expect(config?.orgName).toBeUndefined();
  });
});

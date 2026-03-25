import { vi } from 'vitest';
import type { EnvironmentConfig } from '../../src/types/index.js';

/**
 * Shared mock factories and constants for CLI tests.
 * Reduces duplication flagged by SonarQube across action test files.
 */

// ---------------------------------------------------------------------------
// Common mock objects
// ---------------------------------------------------------------------------

export const createMockLogger = () => ({ log: vi.fn() });

export function createMockEnvConfig(overrides: Partial<EnvironmentConfig> = {}): EnvironmentConfig {
  return {
    baseUrl: 'https://cloud.uipath.com',
    orgId: 'org-id',
    orgName: 'org',
    tenantId: 'tenant-id',
    tenantName: 'tenant',
    folderKey: 'folder-key',
    accessToken: 'token',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Fetch response factory (used by publish, deploy tests)
// ---------------------------------------------------------------------------

export function createMockFetchResponse(options: {
  ok?: boolean;
  status?: number;
  json?: unknown;
  headers?: Record<string, string>;
} = {}) {
  const { ok = true, status = 200, json = {}, headers = {} } = options;
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(json),
    headers: { get: vi.fn((key: string) => headers[key] ?? null) },
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const REQUIRED_ENV_VARS = [
  'UIPATH_BASE_URL',
  'UIPATH_ORG_ID',
  'UIPATH_TENANT_ID',
  'UIPATH_ACCESS_TOKEN',
] as const;

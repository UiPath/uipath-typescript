import { vi } from 'vitest';
import { Config } from '../../src/core/config/config';
import { ExecutionContext } from '../../src/core/context/execution';
import { TokenManager } from '../../src/core/auth/token-manager';
import type { UiPath } from '../../src/core/uipath';
import { __PRIVATE__ } from '../../src/core/internals';

// Mock console methods to avoid test output noise
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
};

// Mock environment variables
process.env.NODE_ENV = 'test';

import { TEST_CONSTANTS } from './constants/common';

/**
 * Creates a mock Config object for testing
 * @param overrides - Optional overrides for specific config values
 * @returns Mock Config object
 */
export const createMockConfig = (overrides?: Partial<Config>): Config => {
  return {
    baseUrl: TEST_CONSTANTS.BASE_URL,
    clientId: TEST_CONSTANTS.CLIENT_ID,
    clientSecret: TEST_CONSTANTS.CLIENT_SECRET,
    organizationId: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantId: TEST_CONSTANTS.TENANT_ID,
    ...overrides,
  } as Config;
};

/**
 * Creates a mock ExecutionContext for testing
 * @returns Mock ExecutionContext instance
 */
export const createMockExecutionContext = (): ExecutionContext => {
  return new ExecutionContext();
};

/**
 * Creates a mock TokenManager for testing
 * @param overrides - Optional overrides for specific methods
 * @returns Mock TokenManager object
 */
export const createMockTokenManager = (overrides?: Partial<TokenManager>): TokenManager => {
  return {
    getToken: vi.fn().mockReturnValue('mock-access-token'),
    hasValidToken: vi.fn().mockReturnValue(true),
    ...overrides,
  } as unknown as TokenManager;
};

/**
 * Mock ApiClient factory
 * @returns Mock ApiClient object
 */
export const createMockApiClient = () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn()
});

/**
 * Creates a mock UiPath instance for testing services
 * @param configOverrides - Optional config overrides
 * @param tokenManagerOverrides - Optional token manager overrides
 * @returns Mock UiPath object with SDK_INTERNALS symbol for internal access
 *
 * @example
 * ```typescript
 * const mockUiPath = createMockUiPath();
 * const service = new MyService(mockUiPath);
 * ```
 */
export const createMockUiPath = (
  configOverrides?: Partial<Config>,
  tokenManagerOverrides?: Partial<TokenManager>
): UiPath => {
  const config = createMockConfig(configOverrides);
  const executionContext = createMockExecutionContext();
  const tokenManager = createMockTokenManager(tokenManagerOverrides);

  return {
    [__PRIVATE__]: {
      config,
      context: executionContext,
      tokenManager
    },
    isAuthenticated: () => true,
    isInitialized: () => true,
  } as unknown as UiPath;
};

/**
 * Creates all common service test dependencies at once
 * @param configOverrides - Optional config overrides
 * @param tokenManagerOverrides - Optional token manager overrides
 * @returns Object containing all common mocks including UiPath mock
 *
 * @example
 * ```typescript
 * // New pattern (recommended)
 * const { instance } = createServiceTestDependencies();
 * const service = new MyService(instance);
 *
 * // Old pattern (for backward compatibility during migration)
 * const { config, executionContext, tokenManager } = createServiceTestDependencies();
 * ```
 */
export const createServiceTestDependencies = (
  configOverrides?: Partial<Config>,
  tokenManagerOverrides?: Partial<TokenManager>
) => {
  const config = createMockConfig(configOverrides);
  const executionContext = createMockExecutionContext();
  const tokenManager = createMockTokenManager(tokenManagerOverrides);

  return {
    config,
    executionContext,
    tokenManager,
    instance: {
      [__PRIVATE__]: {
        config,
        context: executionContext,
        tokenManager
      },
      isAuthenticated: () => true,
      isInitialized: () => true,
    } as unknown as UiPath,
  };
};
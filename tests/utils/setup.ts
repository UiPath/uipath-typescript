import { vi } from 'vitest';
import { UiPathConfig } from '../../src/core/config/config';
import { ExecutionContext } from '../../src/core/context/execution';
import { TokenManager } from '../../src/core/auth/token-manager';
import type { UiPath } from '../../src/core/uipath';
import type { BaseConfig } from '../../src/core/config/sdk-config';
import { SDKInternalsRegistry } from '../../src/core/internals';

/**
 * Interface for mockable UiPath properties used in tests.
 * Only includes the public surface needed for testing services.
 */
interface MockableUiPath {
  config: Readonly<BaseConfig>;
  isAuthenticated: () => boolean;
  isInitialized: () => boolean;
}

/**
 * Interface for mockable TokenManager properties used in tests.
 */
interface MockableTokenManager {
  getToken: () => string | undefined;
  hasValidToken: () => boolean;
}

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
 * Creates a mock UiPathConfig object for testing
 */
const createMockConfig = (overrides?: Partial<UiPathConfig>): UiPathConfig => {
  return new UiPathConfig({
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName: TEST_CONSTANTS.TENANT_ID,
    clientId: TEST_CONSTANTS.CLIENT_ID,
    secret: TEST_CONSTANTS.CLIENT_SECRET,
    ...overrides,
  });
};

/**
 * Creates a mock ExecutionContext for testing
 */
const createMockExecutionContext = (): ExecutionContext => {
  return new ExecutionContext();
};

/**
 * Creates a mock TokenManager for testing
 */
const createMockTokenManager = (overrides?: Partial<MockableTokenManager>): TokenManager => {
  const mock: MockableTokenManager = {
    getToken: vi.fn().mockReturnValue('mock-access-token'),
    hasValidToken: vi.fn().mockReturnValue(true),
    ...overrides,
  };
  return mock as TokenManager;
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
  delete: vi.fn(),
  getValidToken: vi.fn().mockResolvedValue(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN)
});

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
  configOverrides?: Partial<UiPathConfig>,
  tokenManagerOverrides?: Partial<MockableTokenManager>
) => {
  const config = createMockConfig(configOverrides);
  const executionContext = createMockExecutionContext();
  const tokenManager = createMockTokenManager(tokenManagerOverrides);

  // Create mock with explicit interface for type safety
  const mock: MockableUiPath = {
    config: {
      baseUrl: config.baseUrl,
      orgName: config.orgName,
      tenantName: config.tenantName
    },
    isAuthenticated: () => true,
    isInitialized: () => true,
  };

  // Cast to UiPath for compatibility with SDKInternalsRegistry and service constructors
  const mockInstance = mock as UiPath;

  // Register with SDKInternalsRegistry
  SDKInternalsRegistry.set(mockInstance, {
    config,
    context: executionContext,
    tokenManager
  });

  return {
    config,
    executionContext,
    tokenManager,
    instance: mockInstance,
  };
};
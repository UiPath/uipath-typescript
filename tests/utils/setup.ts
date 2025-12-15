import { vi } from 'vitest';
import { UiPathConfig } from '../../src/core/config/config';
import { ExecutionContext } from '../../src/core/context/execution';
import { TokenManager } from '../../src/core/auth/token-manager';
import type { UiPath } from '../../src/core/uipath';
import { SDKInternalsRegistry, type PrivateSDK } from '../../src/core/internals';

/**
 * Helper functions for accessing private SDK components in tests.
 * Now uses SDKInternalsRegistry instead of Symbol pattern.
 */

/**
 * Gets the private SDK components from a UiPath instance
 * @param instance - UiPath instance
 * @returns PrivateSDK containing config, context, and tokenManager
 */
export const getPrivateSDK = (instance: UiPath): PrivateSDK => {
  return SDKInternalsRegistry.get(instance);
};

/**
 * Gets the config from a UiPath instance
 * @param instance - UiPath instance
 * @returns UiPathConfig object
 */
export const getConfig = (instance: UiPath): UiPathConfig => {
  return SDKInternalsRegistry.get(instance).config;
};

/**
 * Gets the execution context from a UiPath instance
 * @param instance - UiPath instance
 * @returns ExecutionContext object
 */
export const getContext = (instance: UiPath): ExecutionContext => {
  return SDKInternalsRegistry.get(instance).context;
};

/**
 * Gets the token manager from a UiPath instance
 * @param instance - UiPath instance
 * @returns TokenManager object
 */
export const getTokenManager = (instance: UiPath): TokenManager => {
  return SDKInternalsRegistry.get(instance).tokenManager;
};

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
 * @param overrides - Optional overrides for specific config values
 * @returns Mock UiPathConfig object
 */
export const createMockConfig = (overrides?: Partial<UiPathConfig>): UiPathConfig => {
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
 * @returns Mock UiPath object registered with SDKInternalsRegistry
 *
 * @example
 * ```typescript
 * const mockUiPath = createMockUiPath();
 * const service = new MyService(mockUiPath);
 * ```
 */
export const createMockUiPath = (
  configOverrides?: Partial<UiPathConfig>,
  tokenManagerOverrides?: Partial<TokenManager>
): UiPath => {
  const config = createMockConfig(configOverrides);
  const executionContext = createMockExecutionContext();
  const tokenManager = createMockTokenManager(tokenManagerOverrides);

  const mockInstance = {
    config: {
      baseUrl: config.baseUrl,
      orgName: config.orgName,
      tenantName: config.tenantName
    },
    isAuthenticated: () => true,
    isInitialized: () => true,
  } as unknown as UiPath;

  // Register with SDKInternalsRegistry
  SDKInternalsRegistry.set(mockInstance, {
    config,
    context: executionContext,
    tokenManager
  });

  return mockInstance;
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
  configOverrides?: Partial<UiPathConfig>,
  tokenManagerOverrides?: Partial<TokenManager>
) => {
  const config = createMockConfig(configOverrides);
  const executionContext = createMockExecutionContext();
  const tokenManager = createMockTokenManager(tokenManagerOverrides);

  const mockInstance = {
    config: {
      baseUrl: config.baseUrl,
      orgName: config.orgName,
      tenantName: config.tenantName
    },
    isAuthenticated: () => true,
    isInitialized: () => true,
  } as unknown as UiPath;

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

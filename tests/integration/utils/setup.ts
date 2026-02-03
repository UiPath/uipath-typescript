import { UiPath } from '../../../src/index';
import { loadIntegrationConfig, IntegrationConfig } from '../config/test-config';
import { afterAll, beforeAll } from 'vitest';

let sdkInstance: UiPath | null = null;
let testConfig: IntegrationConfig | null = null;

/**
 * Initializes the UiPath SDK instance with secret-based authentication.
 * Should be called once before running integration tests.
 *
 * @throws {Error} If SDK initialization or authentication fails
 * @returns {Promise<UiPath>} Initialized and authenticated SDK instance
 */
export async function initializeTestSDK(): Promise<UiPath> {
  if (sdkInstance) {
    return sdkInstance;
  }

  // Load and validate configuration
  testConfig = loadIntegrationConfig();

  // Create SDK instance with secret-based auth
  const sdk = new UiPath({
    baseUrl: testConfig.baseUrl,
    orgName: testConfig.orgName,
    tenantName: testConfig.tenantName,
    secret: testConfig.secret,
  });

  // Secret-based auth initializes automatically
  // Verify authentication status
  if (!sdk.isAuthenticated()) {
    throw new Error(
      'SDK initialization failed: Authentication unsuccessful. ' +
      'Please check your UIPATH_SECRET in .env.integration'
    );
  }

  sdkInstance = sdk;
  return sdk;
}

/**
 * Returns the singleton SDK instance.
 * Throws an error if SDK has not been initialized.
 *
 * @throws {Error} If SDK has not been initialized
 * @returns {UiPath} The initialized SDK instance
 */
export function getTestSDK(): UiPath {
  if (!sdkInstance) {
    throw new Error(
      'SDK has not been initialized. Call initializeTestSDK() or use setupIntegrationTests() in your test suite.'
    );
  }
  return sdkInstance;
}

/**
 * Returns the test configuration.
 * Throws an error if configuration has not been loaded.
 *
 * @throws {Error} If configuration has not been loaded
 * @returns {IntegrationConfig} The test configuration
 */
export function getTestConfig(): IntegrationConfig {
  if (!testConfig) {
    testConfig = loadIntegrationConfig();
  }
  return testConfig;
}

/**
 * Cleans up the SDK instance.
 * Should be called after all tests complete.
 */
export function cleanupTestSDK(): void {
  sdkInstance = null;
  testConfig = null;
}

/**
 * Sets up global beforeAll and afterAll hooks for integration tests.
 * Use this in your test suite's describe block to ensure proper SDK initialization and cleanup.
 *
 * @example
 * ```typescript
 * describe('My Integration Tests', () => {
 *   setupIntegrationTests();
 *
 *   it('should do something', () => {
 *     const sdk = getTestSDK();
 *     // ... test code
 *   });
 * });
 * ```
 */
export function setupIntegrationTests(): void {
  beforeAll(async () => {
    await initializeTestSDK();
  });

  afterAll(() => {
    cleanupTestSDK();
  });
}

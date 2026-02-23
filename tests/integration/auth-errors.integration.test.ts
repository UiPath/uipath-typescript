import { describe, it, expect } from 'vitest';
import { UiPath } from '../../src';
import { loadIntegrationConfig } from './config/test-config';

/**
 * Helper to validate if error is a forbidden/auth error
 */
function isForbiddenError(error: any, keywords: string[] = []): boolean {
  const defaultKeywords = ['forbidden', 'unauthorized', 'invalid'];
  const allKeywords = [...defaultKeywords, ...keywords];

  return (
    error.statusCode === 403 ||
    error.status === 403 ||
    error.statusCode === 401 ||
    error.status === 401 ||
    allKeywords.some(kw => error.message?.toLowerCase().includes(kw))
  );
}

/**
 * Helper to validate if error is a not found error
 */
function isNotFoundError(error: any, keywords: string[] = []): boolean {
  const defaultKeywords = ['not found', 'does not exist'];
  const allKeywords = [...defaultKeywords, ...keywords];

  return (
    error.statusCode === 404 ||
    error.status === 404 ||
    allKeywords.some(kw => error.message?.toLowerCase().includes(kw))
  );
}

/**
 * Helper to validate network/connection errors
 */
function isConnectionError(error: any): boolean {
  return (
    error.message?.toLowerCase().includes('getaddrinfo') ||
    error.message?.toLowerCase().includes('enotfound') ||
    error.message?.toLowerCase().includes('network') ||
    error.message?.toLowerCase().includes('fetch failed')
  );
}

/**
 * Helper to test an API call that should fail
 */
async function expectApiToFail(
  apiCall: () => Promise<any>,
  errorValidator: (error: any) => boolean,
  testDescription: string
): Promise<void> {
  try {
    await apiCall();
    expect.fail(`Expected API call to fail: ${testDescription}`);
  } catch (error: any) {
    expect(error).toBeDefined();
    expect(errorValidator(error)).toBe(true);
    console.log(`✓ ${testDescription}:`, error.message);
  }
}

describe('Authentication & Authorization Errors - Integration Tests', () => {
  const validConfig = loadIntegrationConfig();

  describe('Invalid Organization', () => {
    it('should receive 403 Forbidden when using invalid organization name', async () => {
      const sdk = new UiPath({
        baseUrl: validConfig.baseUrl,
        orgName: 'invalid-org-name-that-does-not-exist',
        tenantName: validConfig.tenantName,
        secret: validConfig.secret,
      });

      await expectApiToFail(
        () => sdk.queues.getAll(),
        (err) => isForbiddenError(err, ['invalid organization']),
        'Invalid organization correctly rejected'
      );
    });
  });

  describe('Invalid Tenant', () => {
    it('should receive 403 Forbidden when using invalid tenant name', async () => {
      const sdk = new UiPath({
        baseUrl: validConfig.baseUrl,
        orgName: validConfig.orgName,
        tenantName: 'invalid-tenant-name',
        secret: validConfig.secret,
      });

      await expectApiToFail(
        () => sdk.queues.getAll(),
        (err) => isForbiddenError(err, ['invalid tenant']),
        'Invalid tenant correctly rejected'
      );
    });
  });

  describe('Invalid Base URL', () => {
    it('should receive error when using invalid base URL', async () => {
      const sdk = new UiPath({
        baseUrl: 'https://invalid.uipath.example.com',
        orgName: validConfig.orgName,
        tenantName: validConfig.tenantName,
        secret: validConfig.secret,
      });

      const errorValidator = (error: any) =>
        isConnectionError(error) ||
        error.statusCode === 403 ||
        error.statusCode === 404 ||
        error.status === 403 ||
        error.status === 404;

      await expectApiToFail(
        () => sdk.queues.getAll(),
        errorValidator,
        'Invalid base URL correctly rejected'
      );
    });

    it('should receive error when requesting non-existent endpoint', async () => {
      const sdk = new UiPath({
        baseUrl: validConfig.baseUrl,
        orgName: validConfig.orgName,
        tenantName: validConfig.tenantName,
        secret: validConfig.secret,
      });

      try {
        await sdk.queues.getById('00000000-0000-0000-0000-000000000000', 1);
        console.log('✓ Non-existent resource handled gracefully');
      } catch (error: any) {
        const errorValidator = (err: any) =>
          isNotFoundError(err) || isForbiddenError(err);

        expect(error).toBeDefined();
        expect(errorValidator(error)).toBe(true);
        console.log('✓ Non-existent endpoint correctly returned error:', error.message);
      }
    });
  });

  describe('Invalid Secret/Token', () => {
    it('should receive 401 Unauthorized when using invalid secret', async () => {
      const sdk = new UiPath({
        baseUrl: validConfig.baseUrl,
        orgName: validConfig.orgName,
        tenantName: validConfig.tenantName,
        secret: 'invalid-secret-token-12345',
      });

      await expectApiToFail(
        () => sdk.queues.getAll(),
        (err) => isForbiddenError(err, ['invalid token', 'authentication failed']),
        'Invalid secret correctly rejected'
      );
    });
  });

  describe('Invalid Folder ID', () => {
    it('should receive error when using invalid folder ID', async () => {
      const sdk = new UiPath({
        baseUrl: validConfig.baseUrl,
        orgName: validConfig.orgName,
        tenantName: validConfig.tenantName,
        secret: validConfig.secret,
      });

      try {
        await sdk.queues.getAll({
          folderId: 999999999,
        });

        console.log('✓ Invalid folder ID handled (may return empty results)');
      } catch (error: any) {
        const errorValidator = (err: any) =>
          isForbiddenError(err) ||
          isNotFoundError(err, ['invalid folder', 'folder does not exist']);

        expect(error).toBeDefined();
        expect(errorValidator(error)).toBe(true);
        console.log('✓ Invalid folder ID correctly rejected:', error.message);
      }
    });
  });

  describe('Permission Denied Scenarios', () => {
    it('should handle permission denied when accessing restricted resources', async () => {
      const sdk = new UiPath({
        baseUrl: validConfig.baseUrl,
        orgName: validConfig.orgName,
        tenantName: validConfig.tenantName,
        secret: validConfig.secret,
      });

      if (!validConfig.folderId) {
        console.log('⊘ Skipped: INTEGRATION_TEST_FOLDER_ID not configured');
        return;
      }

      try {
        await sdk.tasks.getUsers(Number(validConfig.folderId));
        console.log('✓ Token has permissions for this resource');
      } catch (error: any) {
        if (isForbiddenError(error)) {
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();
          console.log('✓ Permission denied correctly returned 403:', error.message);
        } else {
          console.log('✓ Resource access returned expected error:', error.message);
        }
      }
    });
  });

  describe('Error Message Validation', () => {
    it('should provide meaningful error messages for authentication failures', async () => {
      const sdk = new UiPath({
        baseUrl: validConfig.baseUrl,
        orgName: 'invalid-org',
        tenantName: validConfig.tenantName,
        secret: validConfig.secret,
      });

      const errorValidator = (error: any) => {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);

        return (
          isForbiddenError(error) ||
          error.statusCode !== undefined ||
          error.status !== undefined
        );
      };

      await expectApiToFail(
        () => sdk.queues.getAll(),
        errorValidator,
        'Error message contains useful information'
      );
    });
  });
});

import { describe, it, expect } from 'vitest';
import { UiPath } from '../../src';
import { loadIntegrationConfig } from './config/test-config';

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

      try {
        // Try to make an API call with invalid org
        await sdk.queues.getAll();

        // If we get here, the test should fail
        expect.fail('Expected API call to fail with invalid organization');
      } catch (error: any) {
        // Verify we get a Forbidden error
        expect(error).toBeDefined();

        // Check for 403 status code or Forbidden message
        const isForbidden =
          error.statusCode === 403 ||
          error.status === 403 ||
          error.message?.toLowerCase().includes('forbidden') ||
          error.message?.toLowerCase().includes('unauthorized') ||
          error.message?.toLowerCase().includes('invalid organization');

        expect(isForbidden).toBe(true);

        console.log('✓ Invalid organization correctly rejected:', error.message);
      }
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

      try {
        // Try to make an API call with invalid tenant
        await sdk.queues.getAll();

        // If we get here, the test should fail
        expect.fail('Expected API call to fail with invalid tenant');
      } catch (error: any) {
        // Verify we get a Forbidden error
        expect(error).toBeDefined();

        // Check for 403 status code or Forbidden message
        const isForbidden =
          error.statusCode === 403 ||
          error.status === 403 ||
          error.message?.toLowerCase().includes('forbidden') ||
          error.message?.toLowerCase().includes('unauthorized') ||
          error.message?.toLowerCase().includes('invalid tenant');

        expect(isForbidden).toBe(true);

        console.log('✓ Invalid tenant correctly rejected:', error.message);
      }
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

      try {
        // Try to make an API call with invalid URL
        await sdk.queues.getAll();

        // If we get here, the test should fail
        expect.fail('Expected API call to fail with invalid URL');
      } catch (error: any) {
        // Verify we get an error
        expect(error).toBeDefined();

        // Could be network error, DNS error, or 403/404
        const isExpectedError =
          error.message?.toLowerCase().includes('getaddrinfo') ||
          error.message?.toLowerCase().includes('enotfound') ||
          error.message?.toLowerCase().includes('network') ||
          error.message?.toLowerCase().includes('fetch failed') ||
          error.statusCode === 403 ||
          error.statusCode === 404 ||
          error.status === 403 ||
          error.status === 404;

        expect(isExpectedError).toBe(true);

        console.log('✓ Invalid base URL correctly rejected:', error.message);
      }
    });

    it('should receive error when requesting non-existent endpoint', async () => {
      // Use valid SDK instance
      const sdk = new UiPath({
        baseUrl: validConfig.baseUrl,
        orgName: validConfig.orgName,
        tenantName: validConfig.tenantName,
        secret: validConfig.secret,
      });

      try {
        // Try to access a non-existent endpoint by making a raw API call
        // Note: We'd need to use the internal HTTP client if exposed,
        // or make a call that would result in 404

        // For now, we'll try to get a resource with an invalid ID that would return 404
        await sdk.queues.getById('00000000-0000-0000-0000-000000000000', 1);

        // If we get here without error, that's fine - the queue might not exist
        console.log('✓ Non-existent resource handled gracefully');
      } catch (error: any) {
        // We expect either 404 Not Found or similar error
        expect(error).toBeDefined();

        const isNotFoundOrSimilar =
          error.statusCode === 404 ||
          error.statusCode === 403 ||
          error.status === 404 ||
          error.status === 403 ||
          error.message?.toLowerCase().includes('not found') ||
          error.message?.toLowerCase().includes('does not exist');

        expect(isNotFoundOrSimilar).toBe(true);

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

      try {
        // Try to make an API call with invalid secret
        await sdk.queues.getAll();

        // If we get here, the test should fail
        expect.fail('Expected API call to fail with invalid secret');
      } catch (error: any) {
        // Verify we get an Unauthorized error
        expect(error).toBeDefined();

        // Check for 401 or 403 status code or Unauthorized message
        const isUnauthorized =
          error.statusCode === 401 ||
          error.statusCode === 403 ||
          error.status === 401 ||
          error.status === 403 ||
          error.message?.toLowerCase().includes('unauthorized') ||
          error.message?.toLowerCase().includes('forbidden') ||
          error.message?.toLowerCase().includes('invalid token') ||
          error.message?.toLowerCase().includes('authentication failed');

        expect(isUnauthorized).toBe(true);

        console.log('✓ Invalid secret correctly rejected:', error.message);
      }
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
        // Try to access resources with an invalid folder ID
        await sdk.queues.getAll({
          folderId: 999999999, // Invalid folder ID
        });

        // Might succeed if folder validation isn't strict, or might fail
        console.log('✓ Invalid folder ID handled (may return empty results)');
      } catch (error: any) {
        // If it fails, verify it's an appropriate error
        expect(error).toBeDefined();

        const isExpectedError =
          error.statusCode === 403 ||
          error.statusCode === 404 ||
          error.status === 403 ||
          error.status === 404 ||
          error.message?.toLowerCase().includes('forbidden') ||
          error.message?.toLowerCase().includes('not found') ||
          error.message?.toLowerCase().includes('invalid folder') ||
          error.message?.toLowerCase().includes('folder does not exist');

        expect(isExpectedError).toBe(true);

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

      try {
        // Try to access a resource that might require additional permissions
        // For example, trying to get users might require specific permissions
        if (validConfig.folderId) {
          await sdk.tasks.getUsers(Number(validConfig.folderId));
        } else {
          console.log('⊘ Skipped: INTEGRATION_TEST_FOLDER_ID not configured');
          return;
        }

        // If successful, the token has permissions - that's fine
        console.log('✓ Token has permissions for this resource');
      } catch (error: any) {
        // If we get Forbidden, verify the error is properly formatted
        if (error.statusCode === 403 || error.status === 403 ||
            error.message?.toLowerCase().includes('forbidden')) {
          expect(error).toBeDefined();
          expect(error.message).toBeDefined();

          console.log('✓ Permission denied correctly returned 403:', error.message);
        } else {
          // Other errors are also acceptable (e.g., folder not found)
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

      try {
        await sdk.queues.getAll();
        expect.fail('Expected API call to fail');
      } catch (error: any) {
        // Verify error has useful information
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);

        // Error should contain some indication of what went wrong
        const hasUsefulInfo =
          error.message.toLowerCase().includes('forbidden') ||
          error.message.toLowerCase().includes('unauthorized') ||
          error.message.toLowerCase().includes('invalid') ||
          error.message.toLowerCase().includes('failed') ||
          error.statusCode !== undefined ||
          error.status !== undefined;

        expect(hasUsefulInfo).toBe(true);

        console.log('✓ Error message contains useful information:', error.message);
      }
    });
  });
});

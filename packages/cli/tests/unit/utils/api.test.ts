import { describe, it, expect } from 'vitest';
import { createHeaders, buildAppUrl } from '../../../src/utils/api.js';

describe('api utils', () => {
  describe('createHeaders', () => {
    it('should include Content-Type by default', () => {
      const headers = createHeaders();
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should use custom content type', () => {
      const headers = createHeaders({ contentType: 'text/plain' });
      expect(headers['Content-Type']).toBe('text/plain');
    });

    it('should add Authorization header when bearerToken provided', () => {
      const headers = createHeaders({ bearerToken: 'my-token' });
      expect(headers['Authorization']).toBe('Bearer my-token');
    });

    it('should not add Authorization when no token', () => {
      expect(createHeaders()['Authorization']).toBeUndefined();
    });

    it('should add tenant ID header', () => {
      const headers = createHeaders({ tenantId: 'tenant-123' });
      expect(headers['x-uipath-internal-tenantid']).toBe('tenant-123');
    });

    it('should add folder key header', () => {
      const headers = createHeaders({ folderKey: 'folder-abc' });
      expect(headers['x-uipath-folderkey']).toBe('folder-abc');
    });

    it('should merge additional headers', () => {
      const headers = createHeaders({ additionalHeaders: { 'X-Custom': 'value' } });
      expect(headers['X-Custom']).toBe('value');
    });

    it('should include all options together', () => {
      const headers = createHeaders({
        bearerToken: 'token',
        tenantId: 'tenant',
        folderKey: 'folder',
        additionalHeaders: { Accept: 'application/json' },
      });
      expect(headers['Authorization']).toBe('Bearer token');
      expect(headers['x-uipath-internal-tenantid']).toBe('tenant');
      expect(headers['x-uipath-folderkey']).toBe('folder');
      expect(headers['Accept']).toBe('application/json');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('buildAppUrl', () => {
    it.each([
      ['https://cloud.uipath.com', 'https://my-org.uipath.host/my-app'],
      ['https://staging.uipath.com', 'https://my-org.staging.uipath.host/my-app'],
      ['https://alpha.uipath.com', 'https://my-org.alpha.uipath.host/my-app'],
      ['https://cloud.uipath.com/', 'https://my-org.uipath.host/my-app'],
      ['https://custom.example.com', 'https://my-org.uipath.host/my-app'],
    ])('should build URL for %s', (baseUrl, expected) => {
      const url = buildAppUrl(baseUrl, 'my-org', 'my-app');
      expect(url).toBe(expected);
    });
  });
});

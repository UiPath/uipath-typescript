import { describe, it, expect } from 'vitest';
import {
  getBaseUrl,
  buildRedirectUri,
  getAuthorizationBaseUrl,
  getTokenEndpointUrl,
  getPortalApiUrl,
  getOrchestratorApiUrl,
} from '../../../../src/auth/utils/url.js';

describe('auth/utils/url', () => {
  describe('getBaseUrl', () => {
    it('should return cloud URL for "cloud" domain', () => {
      expect(getBaseUrl('cloud')).toContain('uipath.com');
    });
    it('should fallback to cloud URL for unknown domain', () => {
      expect(getBaseUrl('unknown')).toContain('uipath.com');
    });
  });

  describe('buildRedirectUri', () => {
    it('should insert port into redirect URI template', () => {
      const uri = buildRedirectUri(3000);
      expect(uri).toContain('3000');
      expect(uri).toContain('http');
    });
  });

  describe('getAuthorizationBaseUrl', () => {
    it('should append authorize endpoint to base URL', () => {
      const url = getAuthorizationBaseUrl('cloud');
      expect(url).toContain('/authorize');
    });
  });

  describe('getTokenEndpointUrl', () => {
    it('should append token endpoint to base URL', () => {
      const url = getTokenEndpointUrl('cloud');
      expect(url).toContain('/token');
    });
  });

  describe('getPortalApiUrl', () => {
    it('should construct portal API URL with org and path', () => {
      const url = getPortalApiUrl('cloud', 'my-org', '/accounts');
      expect(url).toContain('my-org');
      expect(url).toContain('/accounts');
    });
  });

  describe('getOrchestratorApiUrl', () => {
    it('should construct orchestrator API URL with org, tenant, and path', () => {
      const url = getOrchestratorApiUrl('cloud', 'my-org', 'my-tenant', '/folders');
      expect(url).toContain('my-org');
      expect(url).toContain('my-tenant');
      expect(url).toContain('/folders');
    });
  });
});

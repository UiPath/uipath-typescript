import { describe, it, expect } from 'vitest';
import {
  validateTokenResponse,
  validateJWT,
  validateTokenExchangeRequest,
  validateFolderResponse,
} from '../../../../src/auth/utils/validation.js';

describe('auth/utils/validation', () => {
  describe('validateTokenResponse', () => {
    const validResponse = {
      access_token: 'abc',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'openid',
      refresh_token: 'refresh',
      id_token: 'id',
    };

    it('should return parsed token for valid response', () => {
      const result = validateTokenResponse(validResponse);
      expect(result.accessToken).toBe('abc');
      expect(result.expiresIn).toBe(3600);
      expect(result.tokenType).toBe('Bearer');
      expect(result.scope).toBe('openid');
      expect(result.refreshToken).toBe('refresh');
      expect(result.idToken).toBe('id');
    });

    it('should throw for null input', () => {
      expect(() => validateTokenResponse(null)).toThrow('Invalid token response');
    });

    it('should throw for non-object input', () => {
      expect(() => validateTokenResponse('string')).toThrow('Invalid token response');
    });

    it('should throw for missing access_token', () => {
      expect(() => validateTokenResponse({ ...validResponse, access_token: undefined })).toThrow('access_token');
    });

    it('should throw for missing expires_in', () => {
      expect(() => validateTokenResponse({ ...validResponse, expires_in: undefined })).toThrow('expires_in');
    });

    it('should throw for missing token_type', () => {
      expect(() => validateTokenResponse({ ...validResponse, token_type: undefined })).toThrow('token_type');
    });

    it('should throw for missing scope', () => {
      expect(() => validateTokenResponse({ ...validResponse, scope: undefined })).toThrow('scope');
    });

    it('should collect multiple errors', () => {
      expect(() => validateTokenResponse({})).toThrow(/access_token.*expires_in/);
    });
  });

  describe('validateJWT', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({ sub: '123' })).toString('base64');
    const signature = 'sig';
    const validJWT = `${header}.${payload}.${signature}`;

    it('should not throw for valid JWT', () => {
      expect(() => validateJWT(validJWT)).not.toThrow();
    });

    it('should throw for JWT with wrong number of parts', () => {
      expect(() => validateJWT('a.b')).toThrow('Invalid JWT format');
    });

    it('should throw for JWT with invalid payload', () => {
      expect(() => validateJWT('a.!!!.c')).toThrow('Invalid JWT: unable to decode');
    });
  });

  describe('validateTokenExchangeRequest', () => {
    it('should return code and state for valid request', () => {
      const result = validateTokenExchangeRequest({ code: 'abc', state: 'xyz' });
      expect(result).toEqual({ code: 'abc', state: 'xyz' });
    });

    it('should throw for null body', () => {
      expect(() => validateTokenExchangeRequest(null)).toThrow('Invalid request body');
    });

    it('should throw for missing code', () => {
      expect(() => validateTokenExchangeRequest({ state: 'xyz' })).toThrow('authorization code');
    });

    it('should throw for missing state', () => {
      expect(() => validateTokenExchangeRequest({ code: 'abc' })).toThrow('state parameter');
    });
  });

  describe('validateFolderResponse', () => {
    it('should return true for response with PageItems array', () => {
      expect(validateFolderResponse({ PageItems: [1, 2] })).toBe(true);
    });

    it('should return true for response with value array', () => {
      expect(validateFolderResponse({ value: [1] })).toBe(true);
    });

    it('should return false for null', () => {
      expect(validateFolderResponse(null)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(validateFolderResponse({})).toBe(false);
    });

    it('should return false for non-array PageItems', () => {
      expect(validateFolderResponse({ PageItems: 'not-array' })).toBe(false);
    });
  });
});

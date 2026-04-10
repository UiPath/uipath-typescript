import { describe, it, expect } from 'vitest'
import { validateConfig } from '../src/core/config-reader'

const fullConfig = {
  clientId: 'my-client',
  scope: 'OR.Execution',
  orgName: 'my-org',
  tenantName: 'my-tenant',
  baseUrl: 'https://cloud.uipath.com',
  redirectUri: 'http://localhost:5173',
}

describe('validateConfig', () => {
  describe('valid configs', () => {
    it('passes with all keys in dev mode', () => {
      const result = validateConfig(fullConfig, true)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
      expect(result.warnings).toEqual([])
    })

    it('passes with all keys in prod mode', () => {
      const result = validateConfig(fullConfig, false)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
      expect(result.warnings).toEqual([])
    })
  })

  describe('missing dev keys', () => {
    it('warns in dev mode when keys are missing', () => {
      const { orgName, ...config } = fullConfig
      const result = validateConfig(config, true)
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.includes('orgName'))).toBe(true)
    })

    it('warns in dev mode when multiple keys are missing', () => {
      const config = { scope: 'OR.Execution', clientId: 'my-client' }
      const result = validateConfig(config, true)
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.includes('orgName'))).toBe(true)
      expect(result.warnings.some(w => w.includes('baseUrl'))).toBe(true)
    })

    it('does not warn in prod mode for missing keys', () => {
      const config = { scope: 'OR.Execution', clientId: 'my-client' }
      const result = validateConfig(config, false)
      expect(result.isValid).toBe(true)
      expect(result.warnings).toEqual([])
    })
  })

  describe('key format validation', () => {
    it('errors on snake_case keys with camelCase suggestion', () => {
      const config = { ...fullConfig, client_id: 'my-client' }
      delete (config as Record<string, unknown>).clientId
      const result = validateConfig(config, false)
      expect(result.errors.some(e => e.includes('client_id') && e.includes('clientId'))).toBe(true)
    })

    it('errors on kebab-case keys', () => {
      const config = { ...fullConfig, 'base-url': 'https://example.com' }
      delete (config as Record<string, unknown>).baseUrl
      const result = validateConfig(config, false)
      expect(result.errors.some(e => e.includes('base-url') && e.includes('baseUrl'))).toBe(true)
    })

    it('warns on unknown keys', () => {
      const config = { ...fullConfig, unknownKey: 'value' }
      const result = validateConfig(config, false)
      expect(result.warnings.some(w => w.includes('unknownKey'))).toBe(true)
    })
  })
})

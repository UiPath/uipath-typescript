import { describe, it, expect } from 'vitest'
import { normalizeKey, findMatchingKey, isValidKey, ValidationCollector, createPluginError, formatList } from '../src/core/utils'

describe('normalizeKey', () => {
  it('normalizes camelCase to lowercase', () => {
    expect(normalizeKey('clientId')).toBe('clientid')
    expect(normalizeKey('baseUrl')).toBe('baseurl')
    expect(normalizeKey('redirectUri')).toBe('redirecturi')
  })

  it('normalizes snake_case to lowercase', () => {
    expect(normalizeKey('client_id')).toBe('clientid')
    expect(normalizeKey('base_url')).toBe('baseurl')
    expect(normalizeKey('org_name')).toBe('orgname')
  })

  it('normalizes kebab-case to lowercase', () => {
    expect(normalizeKey('client-id')).toBe('clientid')
    expect(normalizeKey('base-url')).toBe('baseurl')
  })

  it('normalizes PascalCase to lowercase', () => {
    expect(normalizeKey('ClientId')).toBe('clientid')
    expect(normalizeKey('BaseUrl')).toBe('baseurl')
  })

  it('normalizes ALLCAPS to lowercase', () => {
    expect(normalizeKey('BASEURL')).toBe('baseurl')
    expect(normalizeKey('CLIENTID')).toBe('clientid')
  })

  it('normalizes SCREAMING_SNAKE to lowercase', () => {
    expect(normalizeKey('BASE_URL')).toBe('baseurl')
    expect(normalizeKey('CLIENT_ID')).toBe('clientid')
  })
})

describe('findMatchingKey', () => {
  it('returns direct match for valid camelCase keys', () => {
    expect(findMatchingKey('clientId')).toBe('clientId')
    expect(findMatchingKey('scope')).toBe('scope')
    expect(findMatchingKey('baseUrl')).toBe('baseUrl')
  })

  it('returns matching valid key for snake_case input', () => {
    expect(findMatchingKey('client_id')).toBe('clientId')
    expect(findMatchingKey('base_url')).toBe('baseUrl')
    expect(findMatchingKey('org_name')).toBe('orgName')
  })

  it('returns matching valid key for kebab-case input', () => {
    expect(findMatchingKey('client-id')).toBe('clientId')
    expect(findMatchingKey('redirect-uri')).toBe('redirectUri')
  })

  it('returns matching valid key for ALLCAPS input', () => {
    expect(findMatchingKey('BASEURL')).toBe('baseUrl')
    expect(findMatchingKey('CLIENTID')).toBe('clientId')
  })

  it('returns undefined for unknown keys', () => {
    expect(findMatchingKey('unknownKey')).toBeUndefined()
    expect(findMatchingKey('foo')).toBeUndefined()
  })
})

describe('isValidKey', () => {
  it('returns true for valid config keys', () => {
    expect(isValidKey('clientId')).toBe(true)
    expect(isValidKey('scope')).toBe(true)
    expect(isValidKey('orgName')).toBe(true)
  })

  it('returns false for invalid keys (even if normalizable)', () => {
    expect(isValidKey('client_id')).toBe(false)
    expect(isValidKey('BASEURL')).toBe(false)
    expect(isValidKey('unknown')).toBe(false)
  })
})

describe('ValidationCollector', () => {
  it('starts with no errors or warnings', () => {
    const collector = new ValidationCollector()
    expect(collector.hasErrors()).toBe(false)
    expect(collector.getResults()).toEqual({ errors: [], warnings: [] })
  })

  it('collects errors', () => {
    const collector = new ValidationCollector()
    collector.addError('err1').addError('err2')
    expect(collector.hasErrors()).toBe(true)
    expect(collector.getResults().errors).toEqual(['err1', 'err2'])
  })

  it('collects warnings', () => {
    const collector = new ValidationCollector()
    collector.addWarning('warn1')
    expect(collector.hasErrors()).toBe(false)
    expect(collector.getResults().warnings).toEqual(['warn1'])
  })

  it('returns copies from getResults', () => {
    const collector = new ValidationCollector()
    collector.addError('err')
    const results = collector.getResults()
    results.errors.push('mutated')
    expect(collector.getResults().errors).toEqual(['err'])
  })
})

describe('createPluginError', () => {
  it('creates error with plugin prefix', () => {
    const err = createPluginError('something failed')
    expect(err.message).toBe('[coded-apps] something failed')
    expect(err.stack).toBe('')
  })
})

describe('formatList', () => {
  it('formats a list with bullet points', () => {
    const result = formatList(['item1', 'item2'])
    expect(result).toBe('  \u2022 item1\n  \u2022 item2')
  })
})

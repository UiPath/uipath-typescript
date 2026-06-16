import { describe, it, expect } from 'vitest'
import { generateMetaTagsForVite, generateMetaTagsHtml } from '../src/core/meta-tag-generator'
import type { UiPathConfig } from '../src/types'

const fullConfig: UiPathConfig = {
  clientId: 'my-client',
  scope: 'OR.Execution OR.Folders',
  orgName: 'my-org',
  tenantName: 'my-tenant',
  baseUrl: 'https://cloud.uipath.com',
  redirectUri: 'http://localhost:5173',
}

describe('generateMetaTagsForVite', () => {
  it('generates correct Vite meta tags for all known SDK keys', () => {
    const tags = generateMetaTagsForVite(fullConfig)
    expect(tags).toHaveLength(6)

    const clientTag = tags.find(t => t.attrs.name === 'uipath:client-id')
    expect(clientTag).toBeDefined()
    expect(clientTag!.attrs.content).toBe('my-client')
    expect(clientTag!.tag).toBe('meta')
    expect(clientTag!.injectTo).toBe('head')
  })

  it('returns empty array for empty config', () => {
    const tags = generateMetaTagsForVite({})
    expect(tags).toEqual([])
  })

  it('skips keys with falsy values', () => {
    const config: UiPathConfig = { scope: 'OR.Execution', clientId: '' }
    const tags = generateMetaTagsForVite(config)
    expect(tags).toHaveLength(1)
    expect(tags[0].attrs.name).toBe('uipath:scope')
  })

  it('maps all known SDK keys to correct meta tag names', () => {
    const tags = generateMetaTagsForVite(fullConfig)
    const names = tags.map(t => t.attrs.name).sort()
    expect(names).toEqual([
      'uipath:base-url',
      'uipath:client-id',
      'uipath:org-name',
      'uipath:redirect-uri',
      'uipath:scope',
      'uipath:tenant-name',
    ])
  })

  it('injects arbitrary keys from uipath.json as kebab-case meta tags', () => {
    const config: UiPathConfig = {
      ...fullConfig,
      folderKey: 'my-folder-key-123',
      cdnBase: 'https://cdn.example.com',
    }
    const tags = generateMetaTagsForVite(config)
    expect(tags).toHaveLength(8)

    const folderTag = tags.find(t => t.attrs.name === 'uipath:folder-key')
    expect(folderTag).toBeDefined()
    expect(folderTag!.attrs.content).toBe('my-folder-key-123')

    const cdnTag = tags.find(t => t.attrs.name === 'uipath:cdn-base')
    expect(cdnTag).toBeDefined()
    expect(cdnTag!.attrs.content).toBe('https://cdn.example.com')
  })
})

describe('generateMetaTagsHtml', () => {
  it('generates HTML meta tags string', () => {
    const html = generateMetaTagsHtml({ scope: 'OR.Execution', clientId: 'my-client' })
    expect(html).toContain('<meta name="uipath:scope" content="OR.Execution">')
    expect(html).toContain('<meta name="uipath:client-id" content="my-client">')
  })

  it('returns empty string for empty config', () => {
    expect(generateMetaTagsHtml({})).toBe('')
  })

  it('preserves values exactly as provided in config', () => {
    const config: UiPathConfig = { scope: 'OR.Administration OR.Administration.Read' }
    const html = generateMetaTagsHtml(config)
    expect(html).toContain('content="OR.Administration OR.Administration.Read"')
  })

  it('injects arbitrary keys as kebab-case meta tags in HTML format', () => {
    const config: UiPathConfig = { folderKey: 'abc-123', appBase: '/my-app' }
    const html = generateMetaTagsHtml(config)
    expect(html).toContain('<meta name="uipath:folder-key" content="abc-123">')
    expect(html).toContain('<meta name="uipath:app-base" content="/my-app">')
  })
})

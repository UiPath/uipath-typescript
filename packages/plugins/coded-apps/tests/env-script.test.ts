import { describe, it, expect } from 'vitest'
import { renderEnvScript, generateEnvScriptForVite, injectEnvScriptHtml } from '../src/core/env-script'

describe('renderEnvScript', () => {
  it('assigns the global with the values as JSON', () => {
    expect(renderEnvScript({ UIPATH_PUBLIC_REGION: 'EU' })).toBe('window.__UIPATH_ENV__ = {"UIPATH_PUBLIC_REGION":"EU"};')
  })

  it('writes an empty object for no values', () => {
    expect(renderEnvScript({})).toBe('window.__UIPATH_ENV__ = {};')
  })

  it('escapes characters that could close the tag or break the statement', () => {
    const script = renderEnvScript({ UIPATH_PUBLIC_X: '</script>\u2028' })
    expect(script).not.toContain('</script>')
    expect(script).toContain('\\u003c/script>')
    expect(script).toContain('\\u2028')
  })
})

describe('generateEnvScriptForVite', () => {
  it('returns one head-prepend script tag even with no values', () => {
    expect(generateEnvScriptForVite({})).toEqual([
      { tag: 'script', children: 'window.__UIPATH_ENV__ = {};', injectTo: 'head-prepend' },
    ])
  })
})

describe('injectEnvScriptHtml', () => {
  it('places the script directly after <head>, ahead of module scripts', () => {
    const html = '<html><head><script type="module" src="/main.js"></script></head></html>'
    const out = injectEnvScriptHtml(html, { UIPATH_PUBLIC_REGION: 'EU' })
    expect(out.indexOf('__UIPATH_ENV__')).toBeLessThan(out.indexOf('type="module"'))
    expect(out).toContain('<script>window.__UIPATH_ENV__ = {"UIPATH_PUBLIC_REGION":"EU"};</script>')
  })

  it('returns the input unchanged without a <head>', () => {
    expect(injectEnvScriptHtml('<html></html>', {})).toBe('<html></html>')
  })
})

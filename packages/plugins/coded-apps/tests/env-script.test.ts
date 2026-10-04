import { describe, it, expect } from 'vitest'
import { renderEnvScript, generateEnvScriptForVite, injectEnvScriptHtml } from '../src/core/env-script'

function run(script: string, initial?: Record<string, string>): Record<string, string> {
  const fakeWindow: Record<string, unknown> = initial ? { __UIPATH_ENV__: initial } : {}
  new Function('window', script)(fakeWindow)
  return fakeWindow.__UIPATH_ENV__ as Record<string, string>
}

describe('renderEnvScript', () => {
  it('sets the global to the local values when nothing set it', () => {
    expect(run(renderEnvScript({ UIPATH_PUBLIC_REGION: 'EU' }))).toEqual({ UIPATH_PUBLIC_REGION: 'EU' })
  })

  it('leaves values a deployment already set untouched', () => {
    const deployed = { UIPATH_PUBLIC_REGION: 'US' }
    expect(run(renderEnvScript({ UIPATH_PUBLIC_REGION: 'EU' }), deployed)).toBe(deployed)
  })

  it('escapes characters that could close the tag or break the statement', () => {
    const script = renderEnvScript({ UIPATH_PUBLIC_X: '</script>\u2028' })
    expect(script).not.toContain('</script>')
    expect(script).toContain('\\u003c/script>')
    expect(script).toContain('\\u2028')
  })
})

describe('generateEnvScriptForVite', () => {
  it('returns one head-prepend script tag for the values', () => {
    const [tag, ...rest] = generateEnvScriptForVite({ UIPATH_PUBLIC_REGION: 'EU' })
    expect(rest).toEqual([])
    expect(tag).toMatchObject({ tag: 'script', injectTo: 'head-prepend' })
    expect(run(tag.children)).toEqual({ UIPATH_PUBLIC_REGION: 'EU' })
  })

  it('returns no tag when there are no values', () => {
    expect(generateEnvScriptForVite({})).toEqual([])
  })
})

describe('injectEnvScriptHtml', () => {
  it('places the script directly after <head>, ahead of module scripts', () => {
    const html = '<html><head><script type="module" src="/main.js"></script></head></html>'
    const out = injectEnvScriptHtml(html, { UIPATH_PUBLIC_REGION: 'EU' })
    expect(out.indexOf('__UIPATH_ENV__')).toBeLessThan(out.indexOf('type="module"'))
    expect(out).toContain('<script>window.__UIPATH_ENV__ = window.__UIPATH_ENV__ || {"UIPATH_PUBLIC_REGION":"EU"};</script>')
  })

  it('returns the HTML unchanged when there are no values', () => {
    const html = '<html><head><script type="module" src="/main.js"></script></head></html>'
    expect(injectEnvScriptHtml(html, {})).toBe(html)
  })

  it('returns the input unchanged without a <head>', () => {
    expect(injectEnvScriptHtml('<html></html>', {})).toBe('<html></html>')
  })
})

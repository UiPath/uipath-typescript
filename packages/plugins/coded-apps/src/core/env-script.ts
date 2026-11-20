import { ENV_GLOBAL } from '../constants'
import type { EnvironmentVariables, ViteScriptTag } from '../types'

const LESS_THAN_RE = /</g
const LINE_SEPARATOR_RE = /\u2028/g
const PARAGRAPH_SEPARATOR_RE = /\u2029/g
const HEAD_TAG_RE = /<head\b[^>]*>/i

/**
 * The inline statement that exposes local values to the app.
 *
 * It only fills the global when nothing set it first, so a deployment's `env.js`, which runs
 * earlier in `<head>`, always wins over the developer's values.
 *
 * `<` and the Unicode line separators are escaped so a value can never close the script tag or
 * break the statement; the deploy applies the same escaping.
 */
export function renderEnvScript(values: EnvironmentVariables): string {
  const json = JSON.stringify(values)
    .replace(LESS_THAN_RE, '\\u003c')
    .replace(LINE_SEPARATOR_RE, '\\u2028')
    .replace(PARAGRAPH_SEPARATOR_RE, '\\u2029')
  return `window.${ENV_GLOBAL} = window.${ENV_GLOBAL} || ${json};`
}

/**
 * Generate the inline env script in Vite format (for Vite's transformIndexHtml hook).
 *
 * No tag without values, so an app with no env files gets the same HTML it got before.
 */
export function generateEnvScriptForVite(values: EnvironmentVariables): ViteScriptTag[] {
  if (Object.keys(values).length === 0) return []
  return [{ tag: 'script', children: renderEnvScript(values), injectTo: 'head-prepend' }]
}

/**
 * Inject the inline env script directly after `<head>` (for Webpack, Rollup, esbuild), ahead of
 * every module script the bundler emitted. Returns the HTML unchanged when there are no values.
 */
export function injectEnvScriptHtml(html: string, values: EnvironmentVariables): string {
  if (Object.keys(values).length === 0) return html
  const tag = `<script>${renderEnvScript(values)}</script>`
  if (!HEAD_TAG_RE.test(html)) return html
  return html.replace(HEAD_TAG_RE, match => `${match}\n  ${tag}`)
}

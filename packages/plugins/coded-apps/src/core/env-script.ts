import { ENV_GLOBAL } from '../constants'
import type { EnvironmentVariables, ViteScriptTag } from '../types'

/**
 * The inline statement that exposes local values to the app.
 *
 * It only fills the global when nothing set it first. A build the plugin treats as development can
 * still end up deployed (`vite build --mode development`, an unminified esbuild build), and there
 * the deployment's `env.js` runs earlier in `<head>`; its values must win over the developer's.
 *
 * `<` and the Unicode line separators are escaped so a value can never close the script tag or
 * break the statement; the deploy applies the same escaping.
 */
export function renderEnvScript(values: EnvironmentVariables): string {
  const json = JSON.stringify(values)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
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
  if (!/<head\b[^>]*>/i.test(html)) return html
  return html.replace(/<head\b[^>]*>/i, match => `${match}\n  ${tag}`)
}

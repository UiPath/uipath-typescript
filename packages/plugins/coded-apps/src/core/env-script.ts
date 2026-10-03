import { ENV_GLOBAL } from '../constants'
import type { EnvironmentVariables, ViteScriptTag } from '../types'

/**
 * The statement a deployment's `env.js` contains, rendered inline for the dev server.
 *
 * `<` and the Unicode line separators are escaped so a value can never close the script tag or
 * break the statement; the deploy applies the same escaping.
 */
export function renderEnvScript(values: EnvironmentVariables): string {
  const json = JSON.stringify(values)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
  return `window.${ENV_GLOBAL} = ${json};`
}

/**
 * Generate the inline env script in Vite format (for Vite's transformIndexHtml hook).
 *
 * Always one tag, even with no values, so the app sees the global in development exactly as it
 * will deployed, where `env.js` always exists.
 */
export function generateEnvScriptForVite(values: EnvironmentVariables): ViteScriptTag[] {
  return [{ tag: 'script', children: renderEnvScript(values), injectTo: 'head-prepend' }]
}

/**
 * Inject the inline env script directly after `<head>` (for Webpack, Rollup, esbuild), ahead of
 * every module script the bundler emitted.
 */
export function injectEnvScriptHtml(html: string, values: EnvironmentVariables): string {
  const tag = `<script>${renderEnvScript(values)}</script>`
  if (!/<head\b[^>]*>/i.test(html)) return html
  return html.replace(/<head\b[^>]*>/i, match => `${match}\n  ${tag}`)
}

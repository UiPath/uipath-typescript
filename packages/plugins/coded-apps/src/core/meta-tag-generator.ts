import { META_TAG_PREFIX, UIPATH_META_TAGS } from '../constants'
import { isValidKey, camelToKebab } from './utils'
import type { UiPathConfig, ViteMetaTag } from '../types'

/**
 * Generate meta tags in Vite format (for Vite's transformIndexHtml hook).
 *
 * Intended for UiPath SDK configuration keys only (see UIPATH_META_TAGS in constants.ts
 * for the well-known set, plus deployment-time keys like folderKey).
 * Well-known SDK keys use the predefined suffix from UIPATH_META_TAGS; additional keys
 * are converted from camelCase to kebab-case automatically.
 */
export function generateMetaTagsForVite(config: UiPathConfig): ViteMetaTag[] {
  const tags: ViteMetaTag[] = []

  for (const [key, value] of Object.entries(config)) {
    if (value) {
      tags.push({
        tag: 'meta',
        attrs: { name: getMetaTagName(key), content: String(value) },
        injectTo: 'head',
      })
    }
  }

  return tags
}

/**
 * Generate meta tags as HTML string (for Webpack, Rollup, esbuild).
 *
 * Intended for UiPath SDK configuration keys only (see UIPATH_META_TAGS in constants.ts
 * for the well-known set, plus deployment-time keys like folderKey).
 * Well-known SDK keys use the predefined suffix from UIPATH_META_TAGS; additional keys
 * are converted from camelCase to kebab-case automatically.
 */
export function generateMetaTagsHtml(config: UiPathConfig): string {
  const lines: string[] = []

  for (const [key, value] of Object.entries(config)) {
    if (value) {
      lines.push(`<meta name="${getMetaTagName(key)}" content="${value}">`)
    }
  }

  return lines.join('\n  ')
}

/**
 * Map a config key to its meta tag name.
 * Known SDK keys use the predefined mapping (e.g. clientId → uipath:client-id).
 * Unknown keys are converted from camelCase to kebab-case (e.g. folderKey → uipath:folder-key).
 */
function getMetaTagName(configKey: string): string {
  const suffix = isValidKey(configKey) ? UIPATH_META_TAGS[configKey] : camelToKebab(configKey)
  return `${META_TAG_PREFIX}:${suffix}`
}

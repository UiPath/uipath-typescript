import { META_TAG_PREFIX, UIPATH_META_TAGS } from '../constants'
import { isValidKey, camelToKebab } from './utils'
import type { UiPathConfig, ViteMetaTag } from '../types'

/**
 * Generate meta tags in Vite format (for Vite's transformIndexHtml hook).
 *
 * Every key in the config is injected as a `<meta name="uipath:..." content="...">` tag.
 * Well-known SDK keys use the predefined suffix from UIPATH_META_TAGS; all other keys
 * are converted from camelCase to kebab-case automatically.
 */
export function generateMetaTagsForVite(config: UiPathConfig): ViteMetaTag[] {
  const tags: ViteMetaTag[] = []

  for (const [key, value] of Object.entries(config)) {
    if (!value) continue
    tags.push({
      tag: 'meta',
      attrs: { name: getMetaTagName(key), content: String(value) },
      injectTo: 'head',
    })
  }

  return tags
}

/**
 * Generate meta tags as HTML string (for Webpack, Rollup, esbuild).
 *
 * Every key in the config is injected as a `<meta name="uipath:..." content="...">` tag.
 * Well-known SDK keys use the predefined suffix from UIPATH_META_TAGS; all other keys
 * are converted from camelCase to kebab-case automatically.
 */
export function generateMetaTagsHtml(config: UiPathConfig): string {
  const lines: string[] = []

  for (const [key, value] of Object.entries(config)) {
    if (!value) continue
    lines.push(`<meta name="${getMetaTagName(key)}" content="${value}">`)
  }

  return lines.join('\n  ')
}

/**
 * Map a config key to its meta tag name.
 * Known SDK keys use the predefined mapping (e.g. clientId → uipath:client-id).
 * Unknown keys are converted from camelCase to kebab-case (e.g. folderKey → uipath:folder-key).
 */
function getMetaTagName(configKey: string): string {
  if (isValidKey(configKey)) {
    return `${META_TAG_PREFIX}:${UIPATH_META_TAGS[configKey]}`
  }
  return `${META_TAG_PREFIX}:${camelToKebab(configKey)}`
}

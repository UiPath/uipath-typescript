import { META_TAG_PREFIX, UIPATH_META_TAGS } from '../constants'
import { isValidKey } from './utils'
import type { UiPathConfig, ViteMetaTag } from '../types'

/**
 * Generate meta tags in Vite format (for Vite's transformIndexHtml hook).
 */
export function generateMetaTagsForVite(config: UiPathConfig): ViteMetaTag[] {
  const tags: ViteMetaTag[] = []

  for (const [key, value] of Object.entries(config)) {
    const metaName = getMetaTagName(key)
    if (metaName && value) {
      tags.push({
        tag: 'meta',
        attrs: { name: metaName, content: String(value) },
        injectTo: 'head',
      })
    }
  }

  return tags
}

/**
 * Generate meta tags as HTML string (for Webpack, Rollup, esbuild).
 */
export function generateMetaTagsHtml(config: UiPathConfig): string {
  const lines: string[] = []

  for (const [key, value] of Object.entries(config)) {
    const metaName = getMetaTagName(key)
    if (metaName && value) {
      lines.push(`<meta name="${metaName}" content="${value}">`)
    }
  }

  return lines.join('\n  ')
}

function getMetaTagName(configKey: string): string {
  if (!isValidKey(configKey)) return ''
  const suffix = UIPATH_META_TAGS[configKey]
  return suffix ? `${META_TAG_PREFIX}:${suffix}` : ''
}

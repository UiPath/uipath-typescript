import { META_TAG_PREFIX, UIPATH_META_TAGS } from '../constants'
import { KeyUtils } from './utils'
import type { UiPathConfig, ViteMetaTag } from '../types'

/**
 * Generates HTML meta tags from UiPath configuration.
 * Supports both Vite format (objects) and HTML string format.
 */
export class MetaTagGenerator {
  /**
   * Generate meta tags in Vite format (for Vite's transformIndexHtml hook).
   */
  generateViteTags(config: UiPathConfig): ViteMetaTag[] {
    const tags: ViteMetaTag[] = []

    for (const [key, value] of Object.entries(config)) {
      const metaName = this.getMetaTagName(key)
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
  generateHtmlString(config: UiPathConfig): string {
    const lines: string[] = []

    for (const [key, value] of Object.entries(config)) {
      const metaName = this.getMetaTagName(key)
      if (metaName && value) {
        lines.push(`<meta name="${metaName}" content="${value}">`)
      }
    }

    return lines.join('\n  ')
  }

  private getMetaTagName(configKey: string): string {
    if (!KeyUtils.isValid(configKey)) return ''
    const suffix = UIPATH_META_TAGS[configKey]
    return suffix ? `${META_TAG_PREFIX}:${suffix}` : ''
  }
}

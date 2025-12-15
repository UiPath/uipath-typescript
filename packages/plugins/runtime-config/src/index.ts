import type { UnpluginFactory, UnpluginInstance } from 'unplugin'
import { createUnplugin } from 'unplugin'
import type { Options } from './types'
import { PLUGIN_NAME, MESSAGES } from './constants'
import { readConfig, generateMetaTags, generateMetaTagsHtml } from './core'

// ============================================================================
// Plugin Factory
// ============================================================================

export const unpluginFactory: UnpluginFactory<Options | undefined> = (options = {}) => ({
  name: PLUGIN_NAME,

  // Vite-specific hooks
  vite: {
    transformIndexHtml() {
      // isDev is detected via process.env.NODE_ENV in readConfig
      const config = readConfig(options)
      return generateMetaTags(config)
    },
  },

  // Webpack-specific hooks
  webpack(compiler) {
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation: unknown) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const HtmlWebpackPlugin = require('html-webpack-plugin')
        HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(
          PLUGIN_NAME,
          (data: { html: string }, cb: (err: Error | null, data: { html: string }) => void) => {
            try {
              // isDev is detected via process.env.NODE_ENV in readConfig
              const config = readConfig(options)
              const metaTagsHtml = generateMetaTagsHtml(config)
              data.html = data.html.replace('</head>', `  ${metaTagsHtml}\n</head>`)
              cb(null, data)
            } catch (error) {
              cb(error as Error, data)
            }
          },
        )
      } catch {
        console.warn(`[${PLUGIN_NAME}] ${MESSAGES.HTML_WEBPACK_PLUGIN_NOT_FOUND}`)
      }
    })
  },
})

export const unplugin: UnpluginInstance<Options | undefined, boolean> =
  /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin

// ============================================================================
// Re-exports
// ============================================================================

// Types
export type { Options, UiPathConfig, ValidationResult, ReadConfigOptions, ViteMetaTag } from './types'

// Constants
export {
  PLUGIN_NAME,
  DEFAULT_CONFIG_PATH,
  VALID_CONFIG_KEYS,
  REQUIRED_KEY_ALWAYS,
  REQUIRED_KEYS_DEV,
  REQUIRED_KEYS_PROD,
  TYPO_CORRECTIONS,
  CONFIG_TO_META_TAG,
  META_TAG_PREFIX,
  SAMPLE_CONFIG,
  MESSAGES,
} from './constants'

// Core functions
export { readConfig, validateConfig, generateMetaTags, generateMetaTagsHtml } from './core'

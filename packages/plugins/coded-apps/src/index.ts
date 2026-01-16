import type { UnpluginFactory, UnpluginInstance } from 'unplugin'
import { createUnplugin } from 'unplugin'
import type { Options } from './types'
import { PLUGIN_NAME, MESSAGES } from './constants'
import { readConfig, generateMetaTags, generateMetaTagsHtml } from './core'

export const unpluginFactory: UnpluginFactory<Options | undefined> = (options = {}) => {
  let isDev = false

  return {
    name: PLUGIN_NAME,

    // Vite-specific hooks
    vite: {
      configResolved(config) {
        isDev = config.command === 'serve' || config.mode === 'development'
      },
      transformIndexHtml() {
        const config = readConfig({ ...options, isDev })
        return generateMetaTags(config)
      },
    },

    // Webpack-specific hooks
    webpack(compiler) {
      isDev = compiler.options.mode === 'development'

      compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation: unknown) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const HtmlWebpackPlugin = require('html-webpack-plugin')
          HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(
            PLUGIN_NAME,
            (data: { html: string }, cb: (err: Error | null, data: { html: string }) => void) => {
              try {
                const config = readConfig({ ...options, isDev })
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

    // Rollup-specific hooks
    rollup: {
      buildStart() {
        // Rollup doesn't have a direct mode, fall back to NODE_ENV
        isDev = process.env.NODE_ENV === 'development'
      },
    },

    // esbuild-specific hooks
    esbuild: {
      setup(build) {
        // esbuild doesn't have mode concept, use minify as indicator
        isDev = !build.initialOptions.minify
      },
    },
  }
}

export const unplugin: UnpluginInstance<Options | undefined, boolean> =
  /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin

// Types
export type { Options, UiPathConfig, ValidationResult, ReadConfigOptions, ViteMetaTag } from './types'

// Constants
export {
  PLUGIN_NAME,
  CONFIG_FILE_NAME,
  VALID_CONFIG_KEYS,
  REQUIRED_KEY_ALWAYS,
  REQUIRED_KEYS_DEV,
  REQUIRED_KEYS_PROD,
  TYPO_CORRECTIONS,
  UIPATH_META_TAGS,
  META_TAG_PREFIX,
  SAMPLE_CONFIG,
  MESSAGES,
} from './constants'

// Core functions
export { readConfig, validateConfig, generateMetaTags, generateMetaTagsHtml, transformHtml } from './core'

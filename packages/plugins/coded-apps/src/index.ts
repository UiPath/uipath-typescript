import type { UnpluginFactory, UnpluginInstance } from 'unplugin'
import { createUnplugin } from 'unplugin'
import type { Options } from './types'
import { PLUGIN_NAME } from './constants'
import { readConfig, generateMetaTags, generateMetaTagsHtml } from './core/index'

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

      type Compilation = {
        assets: Record<string, { source: () => string | Buffer; size: () => number }>
      }

      compiler.hooks.emit.tapAsync(PLUGIN_NAME, (compilation: Compilation, callback: (err?: Error) => void) => {
        try {
          const config = readConfig({ ...options, isDev })
          const metaTagsHtml = generateMetaTagsHtml(config)

          if (!metaTagsHtml) {
            callback()
            return
          }

          // Find and modify HTML files in output
          for (const filename of Object.keys(compilation.assets)) {
            if (filename.endsWith('.html')) {
              const asset = compilation.assets[filename]
              const html = asset.source().toString()
              const modifiedHtml = html.replace('</head>', `  ${metaTagsHtml}\n  </head>`)

              compilation.assets[filename] = {
                source: () => modifiedHtml,
                size: () => modifiedHtml.length,
              }
            }
          }

          callback()
        } catch (error) {
          callback(error as Error)
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

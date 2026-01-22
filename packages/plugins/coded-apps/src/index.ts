import fs from 'node:fs'
import path from 'node:path'
import type { UnpluginFactory, UnpluginInstance } from 'unplugin'
import { createUnplugin } from 'unplugin'
import type { Options } from './types'
import { PLUGIN_NAME, DEV_MODE } from './constants'
import { readConfig, generateMetaTagsForVite, generateMetaTagsHtml } from './core/index'

export const unpluginFactory: UnpluginFactory<Options | undefined> = (options = {}) => {
  let isDev = false

  return {
    name: PLUGIN_NAME,

    // Vite-specific hooks
    vite: {
      configResolved(config) {
        isDev = config.command === 'serve' || config.mode === DEV_MODE
      },
      transformIndexHtml() {
        const config = readConfig({ ...options, isDev })
        return generateMetaTagsForVite(config)
      },
    },

    // Webpack-specific hooks
    webpack(compiler) {
      isDev = compiler.options.mode === DEV_MODE

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
        isDev = process.env.NODE_ENV === DEV_MODE
      },
      generateBundle(_, bundle) {
        try {
          const config = readConfig({ ...options, isDev })
          const metaTagsHtml = generateMetaTagsHtml(config)
          if (!metaTagsHtml) return

          for (const fileName of Object.keys(bundle)) {
            const asset = bundle[fileName]
            if (
              fileName.endsWith('.html') &&
              asset.type === 'asset' &&
              typeof asset.source === 'string'
            ) {
              asset.source = asset.source.replace('</head>', `  ${metaTagsHtml}\n  </head>`)
            }
          }
        } catch (error) {
          console.error(error)
        }
      },
    },

    // esbuild-specific hooks
    esbuild: {
      setup(build) {
        // esbuild doesn't have mode concept, use minify as indicator
        isDev = !build.initialOptions.minify

        build.onEnd(() => {
          try {
            const config = readConfig({ ...options, isDev })
            const metaTagsHtml = generateMetaTagsHtml(config)
            if (!metaTagsHtml) return

            const outdir = build.initialOptions.outdir
            if (!outdir) return

            const outPath = path.resolve(outdir)
            if (!fs.existsSync(outPath)) return

            for (const file of fs.readdirSync(outPath)) {
              if (file.endsWith('.html')) {
                const filePath = path.join(outPath, file)
                const html = fs.readFileSync(filePath, 'utf-8')
                fs.writeFileSync(
                  filePath,
                  html.replace('</head>', `  ${metaTagsHtml}\n  </head>`)
                )
              }
            }
          } catch {
            // Config errors are already logged by readConfig
          }
        })
      },
    },
  }
}

export const unplugin: UnpluginInstance<Options | undefined, boolean> =
  /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin

import fs from 'node:fs'
import path from 'node:path'
import type { UnpluginFactory, UnpluginInstance } from 'unplugin'
import { createUnplugin } from 'unplugin'
import type { Options } from './types'
import { PLUGIN_NAME, DEV_MODE, DEV_ENV_FILES } from './constants'
import {
  readConfig,
  generateMetaTagsForVite,
  generateMetaTagsHtml,
  readDevEnvValues,
  isWebpackServe,
  generateEnvScriptForVite,
  injectEnvScriptHtml,
} from './core/index'

export const unpluginFactory: UnpluginFactory<Options | undefined> = (options = {}) => {
  let isDev = false
  // Local env values reach only a page a dev server is serving. Anything written to disk can be
  // deployed, and a deployed app must take its values from the deployment's env.js, so Rollup and
  // esbuild builds, `vite build --mode development` and unminified builds never get them.
  let isDevServer = false
  let cachedConfig: ReturnType<typeof readConfig> | null = null
  const configPath = options.configPath ?? 'uipath.json'

  return {
    name: PLUGIN_NAME,

    // Vite-specific hooks
    vite: {
      configResolved(config) {
        isDev = config.command === 'serve' || config.mode === DEV_MODE
        isDevServer = config.command === 'serve'
      },
      configureServer(server) {
        // Watch uipath.json — invalidate cache on change so next request picks it up
        const fullConfigPath = path.resolve(process.cwd(), configPath)
        server.watcher.add(fullConfigPath)
        // Env files are re-read per request, so a change only has to reload the page.
        const envPaths = DEV_ENV_FILES.map(envFile => path.resolve(process.cwd(), envFile))
        server.watcher.add(envPaths)
        server.watcher.on('change', (changedPath) => {
          if (changedPath === fullConfigPath) {
            cachedConfig = null
          } else if (envPaths.includes(changedPath)) {
            server.ws.send({ type: 'full-reload' })
          }
        })
      },
      transformIndexHtml() {
        if (!cachedConfig) {
          cachedConfig = readConfig({ ...options, isDev })
        }
        const tags = generateMetaTagsForVite(cachedConfig)
        const envValues = readDevEnvValues(isDevServer)
        return envValues ? [...generateEnvScriptForVite(envValues), ...tags] : tags
      },
    },

    // Webpack-specific hooks
    webpack(compiler) {
      isDev = compiler.options.mode === DEV_MODE
      isDevServer = isWebpackServe()

      type Compilation = {
        assets: Record<string, { source: () => string | Buffer; size: () => number }>
      }

      compiler.hooks.emit.tapAsync(PLUGIN_NAME, (compilation: Compilation, callback: (err?: Error) => void) => {
        try {
          const config = readConfig({ ...options, isDev })
          const metaTagsHtml = generateMetaTagsHtml(config)
          const envValues = readDevEnvValues(isDevServer)

          if (!metaTagsHtml && !envValues) {
            callback()
            return
          }

          // Find and modify HTML files in output
          for (const filename of Object.keys(compilation.assets)) {
            if (filename.endsWith('.html')) {
              const asset = compilation.assets[filename]
              const html = asset.source().toString()
              let modifiedHtml = envValues ? injectEnvScriptHtml(html, envValues) : html
              if (metaTagsHtml) {
                modifiedHtml = modifiedHtml.replace('</head>', `  ${metaTagsHtml}\n  </head>`)
              }

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
          } catch (error) {
            console.error(error)
          }
        })
      },
    },
  }
}

export const unplugin: UnpluginInstance<Options | undefined, boolean> =
  /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin

import fs from 'node:fs'
import path from 'node:path'
import { parse } from 'dotenv'
import { DEV_ENV_FILES, ENV_MESSAGES, ENV_VARIABLE_PREFIX, PLUGIN_NAME } from '../constants'
import type { EnvironmentVariables } from '../types'

/**
 * Read the `UIPATH_PUBLIC_*` variables for local development.
 *
 * Files are read in order and a later file overrides an earlier one, the precedence Vite itself
 * uses. Missing files are skipped; a dev server has to start with none of them present.
 * `${VAR}` stays literal: the same text means the same thing here and at deploy.
 */
export function readEnvValues(files: readonly string[] = DEV_ENV_FILES, cwd: string = process.cwd()): EnvironmentVariables {
  const merged: Record<string, string> = {}

  for (const file of files) {
    const fullPath = path.resolve(cwd, file)
    if (!fs.existsSync(fullPath)) continue
    try {
      Object.assign(merged, parse(fs.readFileSync(fullPath, 'utf-8')))
    } catch (err) {
      console.warn(`[${PLUGIN_NAME}] ${ENV_MESSAGES.ENV_FILE_READ_ERROR(file, err)}`)
    }
  }

  const values: EnvironmentVariables = {}
  for (const [name, value] of Object.entries(merged)) {
    if (name.startsWith(ENV_VARIABLE_PREFIX)) values[name] = value
  }
  return values
}

/**
 * Values to expose to the page a dev server is serving, or `undefined` when there is nothing to
 * inject: no dev server, or no `UIPATH_PUBLIC_*` value in any env file.
 */
export function readDevEnvValues(isDevServer: boolean): EnvironmentVariables | undefined {
  if (!isDevServer) return undefined
  const values = readEnvValues()
  return Object.keys(values).length > 0 ? values : undefined
}

/** Whether webpack runs as `webpack serve`, which webpack-cli marks by setting `WEBPACK_SERVE`. */
export function isWebpackServe(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.WEBPACK_SERVE === 'true'
}

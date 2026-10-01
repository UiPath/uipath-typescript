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

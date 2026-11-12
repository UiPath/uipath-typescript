import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { isWebpackServe, readDevEnvValues, readEnvValues } from '../src/core/env-reader'

let dir: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coded-apps-env-'))
})

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

function write(name: string, content: string): void {
  fs.writeFileSync(path.join(dir, name), content)
}

describe('readEnvValues', () => {
  it('returns an empty table when no env file exists', () => {
    expect(readEnvValues(undefined, dir)).toEqual({})
  })

  it('keeps UIPATH_APPS_* names only', () => {
    write('.env.local', 'UIPATH_APPS_REGION=EU\nUIPATH_PROJECT_ID=abc\nSECRET=hidden\n')
    expect(readEnvValues(undefined, dir)).toEqual({ UIPATH_APPS_REGION: 'EU' })
  })

  it('applies Vite precedence: .env.local < .env.development < .env.development.local', () => {
    write('.env.local', 'UIPATH_APPS_REGION=US\nUIPATH_APPS_API=https://local\nUIPATH_APPS_TEAM=apps\n')
    write('.env.development', 'UIPATH_APPS_REGION=EU\nUIPATH_APPS_API=https://dev\n')
    write('.env.development.local', 'UIPATH_APPS_API=https://mine\n')
    expect(readEnvValues(undefined, dir)).toEqual({
      UIPATH_APPS_REGION: 'EU',
      UIPATH_APPS_API: 'https://mine',
      UIPATH_APPS_TEAM: 'apps',
    })
  })

  it('leaves a blank value unset, so the app falls back to its own default', () => {
    write('.env.local', 'UIPATH_APPS_REGION=\nUIPATH_APPS_THEME=dark\nUIPATH_APPS_EMPTY=""\n')
    expect(readEnvValues(undefined, dir)).toEqual({ UIPATH_APPS_THEME: 'dark' })
  })

  it('lets a later file unset a value an earlier one set', () => {
    write('.env.local', 'UIPATH_APPS_REGION=US\n')
    write('.env.development', 'UIPATH_APPS_REGION=\n')
    expect(readEnvValues(undefined, dir)).toEqual({})
  })

  it('does not read plain .env', () => {
    write('.env', 'UIPATH_APPS_REGION=EU\n')
    expect(readEnvValues(undefined, dir)).toEqual({})
  })

  it('leaves ${VAR} literal', () => {
    write('.env.local', 'UIPATH_APPS_A=1\nUIPATH_APPS_B=${UIPATH_APPS_A}\n')
    expect(readEnvValues(undefined, dir).UIPATH_APPS_B).toBe('${UIPATH_APPS_A}')
  })

  it('warns and continues when a file cannot be read', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    fs.mkdirSync(path.join(dir, '.env.local'))
    write('.env.development', 'UIPATH_APPS_REGION=EU\n')
    expect(readEnvValues(undefined, dir)).toEqual({ UIPATH_APPS_REGION: 'EU' })
    expect(warn).toHaveBeenCalledOnce()
  })
})

describe('readDevEnvValues', () => {
  it('returns undefined without a dev server', () => {
    write('.env.local', 'UIPATH_APPS_REGION=EU\n')
    const cwd = process.cwd()
    process.chdir(dir)
    try {
      expect(readDevEnvValues(false)).toBeUndefined()
    } finally {
      process.chdir(cwd)
    }
  })

  it('returns undefined under a dev server when no env file sets a UIPATH_APPS_ value', () => {
    write('.env.local', 'OTHER=1\n')
    const cwd = process.cwd()
    process.chdir(dir)
    try {
      expect(readDevEnvValues(true)).toBeUndefined()
    } finally {
      process.chdir(cwd)
    }
  })

  it('returns the values under a dev server', () => {
    write('.env.local', 'UIPATH_APPS_REGION=EU\n')
    const cwd = process.cwd()
    process.chdir(dir)
    try {
      expect(readDevEnvValues(true)).toEqual({ UIPATH_APPS_REGION: 'EU' })
    } finally {
      process.chdir(cwd)
    }
  })
})

describe('isWebpackServe', () => {
  it('is true only when webpack-cli marks the serve command', () => {
    expect(isWebpackServe({ WEBPACK_SERVE: 'true' })).toBe(true)
    expect(isWebpackServe({})).toBe(false)
    expect(isWebpackServe({ NODE_ENV: 'development' })).toBe(false)
  })
})

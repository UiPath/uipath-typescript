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

  it('keeps UIPATH_CLIENT_* names only', () => {
    write('.env.local', 'UIPATH_CLIENT_REGION=EU\nUIPATH_PROJECT_ID=abc\nSECRET=hidden\n')
    expect(readEnvValues(undefined, dir)).toEqual({ UIPATH_CLIENT_REGION: 'EU' })
  })

  it('applies Vite precedence: .env.local < .env.development < .env.development.local', () => {
    write('.env.local', 'UIPATH_CLIENT_REGION=US\nUIPATH_CLIENT_API=https://local\nUIPATH_CLIENT_TEAM=apps\n')
    write('.env.development', 'UIPATH_CLIENT_REGION=EU\nUIPATH_CLIENT_API=https://dev\n')
    write('.env.development.local', 'UIPATH_CLIENT_API=https://mine\n')
    expect(readEnvValues(undefined, dir)).toEqual({
      UIPATH_CLIENT_REGION: 'EU',
      UIPATH_CLIENT_API: 'https://mine',
      UIPATH_CLIENT_TEAM: 'apps',
    })
  })

  it('leaves a blank value unset, so the app falls back to its own default', () => {
    write('.env.local', 'UIPATH_CLIENT_REGION=\nUIPATH_CLIENT_THEME=dark\nUIPATH_CLIENT_EMPTY=""\n')
    expect(readEnvValues(undefined, dir)).toEqual({ UIPATH_CLIENT_THEME: 'dark' })
  })

  it('lets a later file unset a value an earlier one set', () => {
    write('.env.local', 'UIPATH_CLIENT_REGION=US\n')
    write('.env.development', 'UIPATH_CLIENT_REGION=\n')
    expect(readEnvValues(undefined, dir)).toEqual({})
  })

  it('does not read plain .env', () => {
    write('.env', 'UIPATH_CLIENT_REGION=EU\n')
    expect(readEnvValues(undefined, dir)).toEqual({})
  })

  it('leaves ${VAR} literal', () => {
    write('.env.local', 'UIPATH_CLIENT_A=1\nUIPATH_CLIENT_B=${UIPATH_CLIENT_A}\n')
    expect(readEnvValues(undefined, dir).UIPATH_CLIENT_B).toBe('${UIPATH_CLIENT_A}')
  })

  it('warns and continues when a file cannot be read', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    fs.mkdirSync(path.join(dir, '.env.local'))
    write('.env.development', 'UIPATH_CLIENT_REGION=EU\n')
    expect(readEnvValues(undefined, dir)).toEqual({ UIPATH_CLIENT_REGION: 'EU' })
    expect(warn).toHaveBeenCalledOnce()
  })
})

describe('readDevEnvValues', () => {
  it('returns undefined without a dev server', () => {
    write('.env.local', 'UIPATH_CLIENT_REGION=EU\n')
    const cwd = process.cwd()
    process.chdir(dir)
    try {
      expect(readDevEnvValues(false)).toBeUndefined()
    } finally {
      process.chdir(cwd)
    }
  })

  it('returns undefined under a dev server when no env file sets a UIPATH_CLIENT_ value', () => {
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
    write('.env.local', 'UIPATH_CLIENT_REGION=EU\n')
    const cwd = process.cwd()
    process.chdir(dir)
    try {
      expect(readDevEnvValues(true)).toEqual({ UIPATH_CLIENT_REGION: 'EU' })
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

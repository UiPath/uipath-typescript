import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readEnvValues } from '../src/core/env-reader'

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

  it('keeps UIPATH_PUBLIC_* names only', () => {
    write('.env.local', 'UIPATH_PUBLIC_REGION=EU\nUIPATH_PROJECT_ID=abc\nSECRET=hidden\n')
    expect(readEnvValues(undefined, dir)).toEqual({ UIPATH_PUBLIC_REGION: 'EU' })
  })

  it('lets a later file override an earlier one', () => {
    write('.env.development', 'UIPATH_PUBLIC_REGION=EU\nUIPATH_PUBLIC_API=https://dev\n')
    write('.env.local', 'UIPATH_PUBLIC_REGION=US\n')
    expect(readEnvValues(undefined, dir)).toEqual({ UIPATH_PUBLIC_REGION: 'US', UIPATH_PUBLIC_API: 'https://dev' })
  })

  it('does not read plain .env', () => {
    write('.env', 'UIPATH_PUBLIC_REGION=EU\n')
    expect(readEnvValues(undefined, dir)).toEqual({})
  })

  it('leaves ${VAR} literal', () => {
    write('.env.local', 'UIPATH_PUBLIC_A=1\nUIPATH_PUBLIC_B=${UIPATH_PUBLIC_A}\n')
    expect(readEnvValues(undefined, dir).UIPATH_PUBLIC_B).toBe('${UIPATH_PUBLIC_A}')
  })

  it('warns and continues when a file cannot be read', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    fs.mkdirSync(path.join(dir, '.env.local'))
    write('.env.development', 'UIPATH_PUBLIC_REGION=EU\n')
    expect(readEnvValues(undefined, dir)).toEqual({ UIPATH_PUBLIC_REGION: 'EU' })
    expect(warn).toHaveBeenCalledOnce()
  })
})
